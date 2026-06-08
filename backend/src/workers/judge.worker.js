const { Worker } = require('bullmq');
const axios = require('axios');
const db = require('../config/db');
const { connection } = require('../config/queue');

const JUDGE0_URL = process.env.JUDGE0_URL || 'http://localhost:2358';

const runTestCase = async (source_code, language_id, stdin) => {
  // Submit code to Judge0 without expected_output so we can do custom robust comparison
  const submissionResponse = await axios.post(
    `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
    {
      source_code,
      language_id,
      stdin
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  const result = submissionResponse.data;
  return {
    status: result.status,
    time: result.time,
    memory: result.memory,
    stdout: result.stdout,
    stderr: result.stderr,
    compile_output: result.compile_output,
    message: result.message
  };
};

const normalizeOutput = (str) => {
  if (!str) return '';
  // Remove brackets, commas, quotes, and normalize whitespace
  return str.replace(/\[|\]|\{|\}|"|'|,/g, ' ').trim().split(/\s+/).join(' ');
};

const judgeWorker = new Worker('submissions', async job => {
  const { problem_id, source_code, language_id, user_id } = job.data;
  
  console.log(`Processing Job ${job.id} for Problem ${problem_id}`);

  // Fetch test cases
  const { rows: testCases } = await db.query(
    'SELECT input_data, expected_output FROM test_cases WHERE problem_id = $1',
    [problem_id]
  );

  if (testCases.length === 0) {
    throw new Error('No test cases found for problem');
  }

  let finalVerdict = { id: 3, description: 'Accepted' };
  let maxTime = 0;
  let maxMemory = 0;
  const results = [];

  // Iterate and run each test case
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    
    // Update job progress
    await job.updateProgress(Math.floor((i / testCases.length) * 100));

    const result = await runTestCase(source_code, language_id, tc.input_data);
    
    // Custom Robust Output Comparison
    if (result.status.id === 3) {
      const userOutput = normalizeOutput(result.stdout);
      const expectedOut = normalizeOutput(tc.expected_output);
      
      if (userOutput !== expectedOut) {
        result.status = { id: 4, description: 'Wrong Answer' };
        result.message = `Expected: ${tc.expected_output}\nGot: ${result.stdout}`;
      }
    }

    results.push(result);

    const time = parseFloat(result.time) || 0;
    if (time > maxTime) maxTime = time;
    if (result.memory > maxMemory) maxMemory = result.memory;

    if (result.status.id !== 3) { 
      finalVerdict = result.status;
      break;
    }
  }

  // Set 100% progress
  await job.updateProgress(100);

  // Insert submission record into database
  const insertResult = await db.query(
    `INSERT INTO code_submissions (user_id, problem_id, code, language, verdict, runtime, memory)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      user_id || null, 
      problem_id, 
      source_code, 
      language_id.toString(), 
      finalVerdict.description, 
      Math.floor(maxTime * 1000), // convert s to ms
      maxMemory
    ]
  );

  return {
    submission_id: insertResult.rows[0].id,
    verdict: finalVerdict,
    time: maxTime,
    memory: maxMemory,
    test_case_results: results
  };

}, { connection });

judgeWorker.on('completed', job => {
  console.log(`Job ${job.id} has completed with verdict: ${job.returnvalue.verdict.description}`);
});

judgeWorker.on('failed', (job, err) => {
  console.error(`Job ${job.id} has failed with ${err.message}`);
});

module.exports = judgeWorker;
