const express = require('express');
const db = require('../config/db');
const { submissionsQueue } = require('../config/queue');

const router = express.Router();

// POST /api/submit -> Add submission to Queue
router.post('/submit', async (req, res) => {
  const { source_code, language_id, problem_id, user_id } = req.body;

  if (!source_code || !language_id || !problem_id) {
    return res.status(400).json({ success: false, error: 'source_code, language_id, and problem_id are required' });
  }

  try {
    // Add to BullMQ Queue
    const job = await submissionsQueue.add('judge-submission', {
      source_code,
      language_id,
      problem_id,
      user_id: user_id || null
    });

    return res.json({
      success: true,
      jobId: job.id,
      message: 'Submission queued successfully'
    });
  } catch (error) {
    console.error('Queueing Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to queue submission' });
  }
});

// GET /api/submit/status/:jobId -> Poll job status
router.get('/submit/status/:jobId', async (req, res) => {
  try {
    const job = await submissionsQueue.getJob(req.params.jobId);
    
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress;

    if (state === 'completed') {
      return res.json({
        success: true,
        state,
        progress,
        result: job.returnvalue
      });
    } else if (state === 'failed') {
      return res.json({
        success: true,
        state,
        progress,
        error: job.failedReason
      });
    }

    // Active, Waiting, Delayed, etc.
    return res.json({
      success: true,
      state,
      progress
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// GET /api/submissions -> Fetch submission history
router.get('/submissions', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT s.id, s.verdict, s.language, s.runtime, s.memory, s.submitted_at, p.title as problem_title 
      FROM code_submissions s
      JOIN problems p ON s.problem_id = p.id
      ORDER BY s.submitted_at DESC
      LIMIT 50
    `);
    
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
