const db = require('../config/db');
const { Parser } = require('json2csv');

exports.getDashboardData = async (req, res) => {
  try {
    // 1. Total Students
    const studentsRes = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
    const totalStudents = parseInt(studentsRes.rows[0].count) || 0;

    // 2. Class Overview: Total Submissions and AC Rate
    const statsRes = await db.query(`
      SELECT 
        COUNT(*) as total_subs,
        SUM(CASE WHEN verdict = 'Accepted' THEN 1 ELSE 0 END) as total_ac
      FROM code_submissions
    `);
    const totalSubs = parseInt(statsRes.rows[0].total_subs) || 0;
    const acRate = totalSubs > 0 ? Math.round((parseInt(statsRes.rows[0].total_ac) / totalSubs) * 100) : 0;

    // 3. Assignments List
    const assignRes = await db.query(`
      SELECT id, title, deadline, created_at 
      FROM assignments 
      WHERE faculty_id = $1 
      ORDER BY deadline ASC
    `, [req.user.id]);
    const assignments = assignRes.rows;

    res.json({
      success: true,
      data: {
        stats: { totalStudents, totalSubs, acRate },
        assignments
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.createAssignment = async (req, res) => {
  try {
    const { title, deadline, problem_ids } = req.body;
    
    if (!title || !deadline || !problem_ids || !Array.isArray(problem_ids)) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }

    const newAssign = await db.query(
      `INSERT INTO assignments (faculty_id, title, deadline) VALUES ($1, $2, $3) RETURNING id`,
      [req.user.id, title, deadline]
    );
    const assignId = newAssign.rows[0].id;

    for (const pid of problem_ids) {
      await db.query(
        `INSERT INTO assignment_problems (assignment_id, problem_id) VALUES ($1, $2)`,
        [assignId, pid]
      );
    }

    res.json({ success: true, message: 'Assignment created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getAssignmentSubmissions = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get all student submissions for problems in this assignment
    const subsRes = await db.query(`
      SELECT 
        u.name as student_name,
        u.email,
        p.title as problem_title,
        s.verdict,
        s.runtime,
        s.submitted_at
      FROM code_submissions s
      JOIN users u ON s.user_id = u.id
      JOIN problems p ON s.problem_id = p.id
      JOIN assignment_problems ap ON p.id = ap.problem_id
      WHERE ap.assignment_id = $1
      ORDER BY s.submitted_at DESC
    `, [id]);

    res.json({ success: true, data: subsRes.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.exportMarksCSV = async (req, res) => {
  try {
    const { id } = req.params;
    
    // A query that gets the BEST score/verdict for each student per problem in the assignment
    const subsRes = await db.query(`
      SELECT 
        u.name as "Student Name",
        u.email as "Email",
        p.title as "Problem",
        MAX(CASE WHEN s.verdict = 'Accepted' THEN 100 ELSE 0 END) as "Score"
      FROM users u
      JOIN code_submissions s ON u.id = s.user_id
      JOIN problems p ON s.problem_id = p.id
      JOIN assignment_problems ap ON p.id = ap.problem_id
      WHERE ap.assignment_id = $1
      GROUP BY u.name, u.email, p.title
    `, [id]);

    const fields = ['Student Name', 'Email', 'Problem', 'Score'];
    const opts = { fields };
    
    const parser = new Parser(opts);
    const csv = parser.parse(subsRes.rows);

    res.header('Content-Type', 'text/csv');
    res.attachment('marks_export.csv');
    return res.send(csv);

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.createProblem = async (req, res) => {
  try {
    const { title, description, difficulty, tags, test_cases } = req.body;
    
    const pRes = await db.query(
      `INSERT INTO problems (title, description, difficulty, tags) VALUES ($1, $2, $3, $4) RETURNING id`,
      [title, description, difficulty, tags]
    );
    const pid = pRes.rows[0].id;

    if (test_cases && test_cases.length > 0) {
      for (const tc of test_cases) {
        await db.query(
          `INSERT INTO test_cases (problem_id, input_data, expected_output) VALUES ($1, $2, $3)`,
          [pid, tc.input, tc.output]
        );
      }
    }

    res.json({ success: true, message: 'Problem added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.generateAITestCases = async (req, res) => {
  try {
    const { title, description } = req.body;
    
    // Simulate an AI call (e.g. OpenAI GPT-4)
    // In production, you would pass `title` and `description` to the LLM and ask for JSON test cases.
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate AI thinking delay

    const mockAIGeneratedCases = Array.from({ length: 15 }).map((_, i) => ({
      input: `AI Edge Case Input ${i+1}`,
      output: `AI Expected Output ${i+1}`
    }));

    res.json({
      success: true,
      message: 'AI generated 15 edge cases successfully',
      data: mockAIGeneratedCases
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'AI Generation Failed' });
  }
};
