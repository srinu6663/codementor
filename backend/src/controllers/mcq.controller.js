const db = require('../config/db');
const { logAction } = require('../middleware/audit');

const CATEGORIES = ['aptitude', 'technical', 'verbal', 'logical', 'general'];

// ── Faculty: create a test ──────────────────────────────────────────────────────
exports.createTest = async (req, res) => {
  try {
    const { title, description, category, duration_minutes } = req.body;
    if (!title || typeof title !== 'string' || title.length > 200) {
      return res.status(400).json({ success: false, error: 'Title is required and must be ≤ 200 characters.' });
    }
    const cat = CATEGORIES.includes(category) ? category : 'aptitude';
    const dur = Math.min(Math.max(parseInt(duration_minutes, 10) || 30, 1), 300);

    const { rows: [t] } = await db.query(
      `INSERT INTO mcq_tests (faculty_id, title, description, category, duration_minutes)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.user.id, title.trim(), (description || '').slice(0, 2000) || null, cat, dur]
    );
    logAction(req, 'mcq.create', `test "${title.trim()}"`);
    res.status(201).json({ success: true, data: { id: t.id } });
  } catch (e) {
    console.error('MCQ createTest error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Ownership guard (admins bypass).
async function ownsTest(req, testId) {
  const { rows } = await db.query(
    `SELECT id FROM mcq_tests WHERE id = $1 AND (faculty_id = $2 OR $3 = 'admin')`,
    [testId, req.user.id, req.user.role]
  );
  return rows.length > 0;
}

// ── Faculty: replace a test's questions in bulk ─────────────────────────────────
exports.setQuestions = async (req, res) => {
  try {
    const { id } = req.params;
    const { questions } = req.body;
    if (!(await ownsTest(req, id))) return res.status(404).json({ success: false, error: 'Test not found' });
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one question is required.' });
    }
    if (questions.length > 200) {
      return res.status(400).json({ success: false, error: 'A test can have at most 200 questions.' });
    }

    // Validate every question before writing anything.
    for (const [i, q] of questions.entries()) {
      const opts = q.options;
      if (!q.question_text || typeof q.question_text !== 'string') {
        return res.status(400).json({ success: false, error: `Question ${i + 1}: text is required.` });
      }
      if (!Array.isArray(opts) || opts.length < 2 || opts.length > 6 || !opts.every(o => typeof o === 'string' && o.trim())) {
        return res.status(400).json({ success: false, error: `Question ${i + 1}: provide 2–6 non-empty options.` });
      }
      if (!Number.isInteger(q.correct_index) || q.correct_index < 0 || q.correct_index >= opts.length) {
        return res.status(400).json({ success: false, error: `Question ${i + 1}: correct_index is out of range.` });
      }
    }

    await db.query('DELETE FROM mcq_questions WHERE test_id = $1', [id]);
    for (const [i, q] of questions.entries()) {
      await db.query(
        `INSERT INTO mcq_questions (test_id, question_text, options, correct_index, marks, topic, explanation, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, q.question_text.trim(), JSON.stringify(q.options.map(o => String(o))),
         q.correct_index, Math.max(parseInt(q.marks, 10) || 1, 1),
         (q.topic || '').slice(0, 60) || null, (q.explanation || '').slice(0, 1000) || null, i]
      );
    }
    res.json({ success: true, data: { count: questions.length } });
  } catch (e) {
    console.error('MCQ setQuestions error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Faculty: list own tests ─────────────────────────────────────────────────────
exports.listTests = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT t.id, t.title, t.category, t.duration_minutes, t.is_published, t.created_at,
             (SELECT COUNT(*) FROM mcq_questions q WHERE q.test_id = t.id)::int AS question_count,
             (SELECT COUNT(*) FROM mcq_attempts a WHERE a.test_id = t.id AND a.submitted_at IS NOT NULL)::int AS attempt_count
        FROM mcq_tests t
       WHERE t.faculty_id = $1 OR $2 = 'admin'
       ORDER BY t.created_at DESC
    `, [req.user.id, req.user.role]);
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('MCQ listTests error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Faculty: full test with questions (incl. answers) ───────────────────────────
exports.getTestFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await ownsTest(req, id))) return res.status(404).json({ success: false, error: 'Test not found' });
    const { rows: [test] } = await db.query('SELECT * FROM mcq_tests WHERE id = $1', [id]);
    const { rows: questions } = await db.query(
      'SELECT id, question_text, options, correct_index, marks, topic, explanation, position FROM mcq_questions WHERE test_id = $1 ORDER BY position ASC',
      [id]
    );
    res.json({ success: true, data: { test, questions } });
  } catch (e) {
    console.error('MCQ getTestFaculty error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Faculty: publish / unpublish ────────────────────────────────────────────────
exports.publishTest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await ownsTest(req, id))) return res.status(404).json({ success: false, error: 'Test not found' });
    const publish = req.body.is_published === true;
    if (publish) {
      const { rows: [{ count }] } = await db.query('SELECT COUNT(*)::int AS count FROM mcq_questions WHERE test_id = $1', [id]);
      if (count === 0) return res.status(400).json({ success: false, error: 'Add questions before publishing.' });
    }
    await db.query('UPDATE mcq_tests SET is_published = $1 WHERE id = $2', [publish, id]);
    res.json({ success: true, data: { is_published: publish } });
  } catch (e) {
    console.error('MCQ publishTest error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Faculty: delete ─────────────────────────────────────────────────────────────
exports.deleteTest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await ownsTest(req, id))) return res.status(404).json({ success: false, error: 'Test not found' });
    await db.query('DELETE FROM mcq_tests WHERE id = $1', [id]);
    logAction(req, 'mcq.delete', `test ${id}`);
    res.json({ success: true });
  } catch (e) {
    console.error('MCQ deleteTest error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Faculty: results + analytics ────────────────────────────────────────────────
exports.getResults = async (req, res) => {
  try {
    const { id } = req.params;
    if (!(await ownsTest(req, id))) return res.status(404).json({ success: false, error: 'Test not found' });

    const { rows: attempts } = await db.query(`
      SELECT a.user_id, a.score, a.total, a.submitted_at,
             u.name, u.email, u.roll_no, u.department, u.section
        FROM mcq_attempts a
        JOIN users u ON u.id = a.user_id
       WHERE a.test_id = $1 AND a.submitted_at IS NOT NULL
       ORDER BY a.score DESC NULLS LAST, a.submitted_at ASC
    `, [id]);

    // Per-question accuracy (how many got each question right).
    const { rows: questions } = await db.query(
      'SELECT id, question_text, correct_index, topic, position FROM mcq_questions WHERE test_id = $1 ORDER BY position ASC',
      [id]
    );
    const { rows: respRows } = await db.query(
      'SELECT responses FROM mcq_attempts WHERE test_id = $1 AND submitted_at IS NOT NULL', [id]
    );
    const perQ = {};
    for (const q of questions) perQ[q.id] = { correct: 0, answered: 0 };
    for (const r of respRows) {
      const resp = r.responses || {};
      for (const q of questions) {
        if (resp[q.id] != null) {
          perQ[q.id].answered += 1;
          if (resp[q.id] === q.correct_index) perQ[q.id].correct += 1;
        }
      }
    }
    const questionStats = questions.map(q => ({
      id: q.id, question_text: q.question_text, topic: q.topic,
      answered: perQ[q.id].answered, correct: perQ[q.id].correct,
      accuracy: perQ[q.id].answered ? Math.round((perQ[q.id].correct / perQ[q.id].answered) * 100) : 0,
    }));

    const scores = attempts.map(a => a.score || 0);
    const avg = scores.length ? Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 10) / 10 : 0;

    res.json({
      success: true,
      data: {
        attempts: attempts.map(a => ({
          userId: a.user_id, name: a.name, email: a.email, rollNo: a.roll_no,
          department: a.department, section: a.section,
          score: a.score, total: a.total, submittedAt: a.submitted_at,
        })),
        summary: { attempts: attempts.length, avgScore: avg, maxScore: scores.length ? Math.max(...scores) : 0 },
        questionStats,
      },
    });
  } catch (e) {
    console.error('MCQ getResults error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Student: list published tests (with own attempt status) ─────────────────────
exports.listAvailable = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT t.id, t.title, t.description, t.category, t.duration_minutes,
             (SELECT COUNT(*) FROM mcq_questions q WHERE q.test_id = t.id)::int AS question_count,
             a.submitted_at, a.score, a.total
        FROM mcq_tests t
        LEFT JOIN mcq_attempts a ON a.test_id = t.id AND a.user_id = $1
       WHERE t.is_published = true
       ORDER BY t.created_at DESC
    `, [req.user.id]);
    res.json({
      success: true,
      data: rows.map(r => ({
        id: r.id, title: r.title, description: r.description, category: r.category,
        durationMinutes: r.duration_minutes, questionCount: r.question_count,
        attempted: !!r.submitted_at, score: r.score, total: r.total,
      })),
    });
  } catch (e) {
    console.error('MCQ listAvailable error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Student: start a test (questions WITHOUT answers) ───────────────────────────
exports.startTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: [test] } = await db.query('SELECT id, title, category, duration_minutes, is_published FROM mcq_tests WHERE id = $1', [id]);
    if (!test || !test.is_published) return res.status(404).json({ success: false, error: 'Test not available' });

    const { rows: [existing] } = await db.query(
      'SELECT submitted_at FROM mcq_attempts WHERE test_id = $1 AND user_id = $2', [id, req.user.id]
    );
    if (existing && existing.submitted_at) {
      return res.status(409).json({ success: false, error: 'You have already submitted this test.' });
    }

    // Record start time (idempotent).
    await db.query(
      `INSERT INTO mcq_attempts (test_id, user_id) VALUES ($1, $2)
       ON CONFLICT (test_id, user_id) DO NOTHING`,
      [id, req.user.id]
    );

    const { rows: questions } = await db.query(
      'SELECT id, question_text, options, marks, topic, position FROM mcq_questions WHERE test_id = $1 ORDER BY position ASC',
      [id]
    );
    res.json({
      success: true,
      data: {
        test: { id: test.id, title: test.title, category: test.category, durationMinutes: test.duration_minutes },
        questions, // no correct_index / explanation
      },
    });
  } catch (e) {
    console.error('MCQ startTest error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Student: submit answers → auto-grade ────────────────────────────────────────
exports.submitTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { responses } = req.body; // { questionId: selectedIndex }
    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({ success: false, error: 'responses object is required.' });
    }

    const { rows: [test] } = await db.query('SELECT id, is_published FROM mcq_tests WHERE id = $1', [id]);
    if (!test || !test.is_published) return res.status(404).json({ success: false, error: 'Test not available' });

    const { rows: [existing] } = await db.query(
      'SELECT submitted_at FROM mcq_attempts WHERE test_id = $1 AND user_id = $2', [id, req.user.id]
    );
    if (existing && existing.submitted_at) {
      return res.status(409).json({ success: false, error: 'Already submitted.' });
    }

    const { rows: questions } = await db.query(
      'SELECT id, correct_index, marks, explanation FROM mcq_questions WHERE test_id = $1', [id]
    );
    let score = 0, total = 0;
    const review = [];
    const cleanResp = {};
    for (const q of questions) {
      total += q.marks;
      const sel = responses[q.id];
      const selected = Number.isInteger(sel) ? sel : null;
      cleanResp[q.id] = selected;
      const correct = selected === q.correct_index;
      if (correct) score += q.marks;
      review.push({ questionId: q.id, selected, correctIndex: q.correct_index, correct, explanation: q.explanation });
    }

    await db.query(
      `INSERT INTO mcq_attempts (test_id, user_id, started_at, submitted_at, score, total, responses)
       VALUES ($1, $2, NOW(), NOW(), $3, $4, $5)
       ON CONFLICT (test_id, user_id)
       DO UPDATE SET submitted_at = NOW(), score = $3, total = $4, responses = $5`,
      [id, req.user.id, score, total, JSON.stringify(cleanResp)]
    );

    res.json({ success: true, data: { score, total, review } });
  } catch (e) {
    console.error('MCQ submitTest error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
