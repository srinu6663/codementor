const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { submissionsQueue } = require('../config/queue');
const jwt = require('jsonwebtoken');
const { submitBurstLimiter, submitSustainedLimiter } = require('../middleware/rateLimiter');
const { enforceExamIP } = require('../middleware/cidrCheck');

const router = express.Router();

// Helper: extract user_id from JWT (optional auth)
const extractUserId = (req) => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
      return decoded.id;
    } catch {
      return null;
    }
  }
  return null;
};

// Allowed Judge0 language IDs (C++, Java, Python3, JavaScript, C, Go, Rust, TypeScript)
const ALLOWED_LANGUAGE_IDS = new Set([50, 51, 52, 54, 62, 63, 71, 72, 73, 74, 75, 76]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CODE_BYTES = 64 * 1024; // 64 KB
const MAX_INPUT_BYTES = 8 * 1024; // 8 KB

// POST /api/submit — enqueue submission
router.post('/submit', submitBurstLimiter, submitSustainedLimiter, enforceExamIP, async (req, res) => {
  try {
    const { source_code, language_id, problem_id, custom_input, contest_id } = req.body;

    if (!source_code || !language_id || !problem_id) {
      return res.status(400).json({ success: false, error: 'source_code, language_id, and problem_id are required' });
    }
    if (contest_id && !UUID_RE.test(String(contest_id))) {
      return res.status(400).json({ success: false, error: 'Invalid contest_id format.' });
    }
    if (typeof source_code !== 'string' || Buffer.byteLength(source_code, 'utf8') > MAX_CODE_BYTES) {
      return res.status(400).json({ success: false, error: 'source_code exceeds 64 KB limit.' });
    }
    if (!ALLOWED_LANGUAGE_IDS.has(Number(language_id))) {
      return res.status(400).json({ success: false, error: 'Unsupported language_id.' });
    }
    if (!UUID_RE.test(String(problem_id))) {
      return res.status(400).json({ success: false, error: 'Invalid problem_id format.' });
    }
    if (custom_input && typeof custom_input === 'string' && Buffer.byteLength(custom_input, 'utf8') > MAX_INPUT_BYTES) {
      return res.status(400).json({ success: false, error: 'custom_input exceeds 8 KB limit.' });
    }

    const user_id = extractUserId(req);
    const jobId = uuidv4();

    try {
      await submissionsQueue.add('judge-submission', {
        jobId, source_code, language_id, problem_id, user_id,
        custom_input: custom_input || null,
        contest_id: custom_input ? null : (contest_id || null),
      }, { jobId });
    } catch (queueErr) {
      console.error('Queue add failed:', queueErr.message);
      return res.status(503).json({
        success: false,
        queue_full: true,
        error: 'The judge is currently overloaded. Please try again in a moment.',
      });
    }

    return res.json({ success: true, jobId, message: 'Submission queued successfully' });
  } catch (error) {
    console.error('Queueing Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to queue submission' });
  }
});

// NOTE: the GET /api/submit/status/:jobId polling endpoint was removed —
// verdicts are now delivered in real time via Socket.IO job rooms.

// GET /api/submit/history/:problemId — per-problem submission history for current user
router.get('/submit/history/:problemId', async (req, res) => {
  try {
    const user_id = extractUserId(req);
    if (!user_id) return res.json({ success: true, data: [] });

    const { rows } = await db.query(`
      SELECT id, verdict, language, runtime, memory, submitted_at, code
      FROM code_submissions
      WHERE user_id = $1 AND problem_id = $2
      ORDER BY submitted_at DESC
      LIMIT 20
    `, [user_id, req.params.problemId]);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/submissions — full history (last 50)
router.get('/submissions', async (req, res) => {
  try {
    const user_id = extractUserId(req);
    const query = user_id
      ? `SELECT s.id, s.verdict, s.language, s.runtime, s.memory, s.submitted_at, p.title as problem_title, p.id as problem_id
         FROM code_submissions s JOIN problems p ON s.problem_id = p.id
         WHERE s.user_id = $1 ORDER BY s.submitted_at DESC LIMIT 50`
      : `SELECT s.id, s.verdict, s.language, s.runtime, s.memory, s.submitted_at, p.title as problem_title, p.id as problem_id
         FROM code_submissions s JOIN problems p ON s.problem_id = p.id
         ORDER BY s.submitted_at DESC LIMIT 50`;

    const { rows } = user_id
      ? await db.query(query, [user_id])
      : await db.query(query);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
