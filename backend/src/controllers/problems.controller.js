const db = require('../config/db');

// @desc    Get all problems
// @route   GET /api/problems
exports.getProblems = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, title, difficulty, tags, time_limit, memory_limit FROM problems ORDER BY id DESC'
    );
    res.json({ success: true, count: rows.length, data: rows });
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
