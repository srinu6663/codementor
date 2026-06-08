const express = require('express');
const axios = require('axios');
const router = express.Router();

const JUDGE0_URL = process.env.JUDGE0_URL || 'http://localhost:2358';

// POST /api/submit -> Submit code to Judge0 and wait for result
router.post('/submit', async (req, res) => {
  const { source_code, language_id } = req.body;

  if (!source_code || !language_id) {
    return res.status(400).json({ success: false, error: 'source_code and language_id are required' });
  }

  try {
    // 1. Send submission to Judge0
    const submissionResponse = await axios.post(
      `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
      {
        source_code,
        language_id
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const result = submissionResponse.data;

    // 2. Return result directly
    return res.json({
      success: true,
      data: {
        stdout: result.stdout,
        stderr: result.stderr,
        compile_output: result.compile_output,
        message: result.message,
        time: result.time,
        memory: result.memory,
        status: result.status
      }
    });
  } catch (error) {
    console.error('Judge0 Execution Error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute code',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;
