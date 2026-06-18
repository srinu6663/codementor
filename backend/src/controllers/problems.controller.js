const db = require('../config/db');

// @desc    Get all problems (with optional filters)
// @route   GET /api/problems
const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

exports.getProblems = async (req, res) => {
  try {
    let { difficulty, tag, search, limit } = req.query;
    const conditions = [];
    const params = [];

    if (difficulty) {
      if (!ALLOWED_DIFFICULTIES.has(String(difficulty).toLowerCase())) {
        return res.status(400).json({ success: false, error: 'Invalid difficulty value.' });
      }
      params.push(difficulty);
      conditions.push(`difficulty = $${params.length}`);
    }
    if (tag) {
      tag = String(tag).slice(0, 50);
      params.push(tag);
      conditions.push(`$${params.length} = ANY(tags)`);
    }
    if (search) {
      search = String(search).slice(0, 100);
      params.push(`%${search}%`);
      conditions.push(`title ILIKE $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 200);
    const limitClause = `LIMIT ${parsedLimit}`;

    const { rows } = await db.query(
      `SELECT id, title, difficulty, tags, time_limit, memory_limit, created_at
       FROM problems ${where}
       ORDER BY created_at DESC ${limitClause}`,
      params
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get prev/next problem IDs for navigation
// @route   GET /api/problems/:id/adjacent
exports.getAdjacentProblems = async (req, res) => {
  try {
    const { id } = req.params;

    // Get all problem IDs ordered by creation date
    const { rows } = await db.query(
      'SELECT id FROM problems ORDER BY created_at ASC'
    );

    const idx = rows.findIndex(r => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    res.json({
      success: true,
      data: {
        prev: idx > 0 ? rows[idx - 1].id : null,
        next: idx < rows.length - 1 ? rows[idx + 1].id : null,
        position: idx + 1,
        total: rows.length
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get a single problem with public test cases
// @route   GET /api/problems/:id
exports.getProblemById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const problemResult = await db.query('SELECT * FROM problems WHERE id = $1', [id]);
    
    if (problemResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    const problem = problemResult.rows[0];

    // Fetch public test cases
    const testCasesResult = await db.query(
      'SELECT input_data, expected_output FROM test_cases WHERE problem_id = $1 AND is_public = true',
      [id]
    );

    problem.test_cases = testCasesResult.rows;
    // The solve page consumes `examples` with {input, output} field names.
    problem.examples = testCasesResult.rows.map(r => ({
      input: r.input_data,
      output: r.expected_output,
    }));

    // Hide editorial if not yet published
    const now = new Date();
    if (!problem.editorial_visible_at || new Date(problem.editorial_visible_at) > now) {
      problem.editorial = null;
    }
    problem.editorial_unlocked = !!problem.editorial;

    res.json({ success: true, data: problem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Create a new problem (with test cases)
// @route   POST /api/problems
exports.createProblem = async (req, res) => {
  try {
    const { title, description, difficulty, tags, time_limit, memory_limit, test_cases } = req.body;

    // Insert Problem
    const problemResult = await db.query(
      `INSERT INTO problems (title, description, difficulty, tags, time_limit, memory_limit)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description, difficulty, tags || [], time_limit || 2, memory_limit || 256]
    );

    const newProblem = problemResult.rows[0];

    // Insert Test Cases if provided
    if (test_cases && test_cases.length > 0) {
      for (const tc of test_cases) {
        await db.query(
          `INSERT INTO test_cases (problem_id, input_data, expected_output, is_public)
           VALUES ($1, $2, $3, $4)`,
          [newProblem.id, tc.input, tc.expected_output, tc.is_public || false]
        );
      }
    }

    res.status(201).json({ success: true, data: newProblem });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Update a problem
// @route   PUT /api/problems/:id
exports.updateProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, difficulty, tags, time_limit, memory_limit } = req.body;

    const result = await db.query(
      `UPDATE problems 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           difficulty = COALESCE($3, difficulty),
           tags = COALESCE($4, tags),
           time_limit = COALESCE($5, time_limit),
           memory_limit = COALESCE($6, memory_limit)
       WHERE id = $7 RETURNING *`,
      [title, description, difficulty, tags, time_limit, memory_limit, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Delete a problem
// @route   DELETE /api/problems/:id
exports.deleteProblem = async (req, res) => {
  try {
    const { id } = req.params;

    // test_cases are deleted automatically due to ON DELETE CASCADE
    const result = await db.query('DELETE FROM problems WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Problem not found' });
    }

    res.json({ success: true, data: {} });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
