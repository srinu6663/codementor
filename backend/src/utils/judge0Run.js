const axios = require('axios');

const JUDGE0_URL = process.env.JUDGE0_URL || 'http://localhost:2358';

const headers = () => {
  const token = process.env.JUDGE0_AUTH_TOKEN;
  return { 'Content-Type': 'application/json', ...(token ? { 'X-Auth-Token': token } : {}) };
};

// Run one program on Judge0 (synchronous wait). Returns { ok, stdout, stderr, message, statusId }.
async function runOnJudge0({ source_code, language_id, stdin = '', cpu = 5, wall = 10 }) {
  try {
    const res = await axios.post(
      `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
      { source_code, language_id, stdin, cpu_time_limit: cpu, wall_time_limit: wall, memory_limit: 262144 },
      { headers: headers(), timeout: 20000 }
    );
    const r = res.data || {};
    const statusId = r.status?.id;
    return {
      ok: statusId === 3, // Accepted/finished cleanly
      stdout: r.stdout || '',
      stderr: r.stderr || '',
      message: r.message || r.compile_output || (r.status?.description) || '',
      statusId,
    };
  } catch (err) {
    return { ok: false, stdout: '', stderr: '', message: err.message, statusId: null };
  }
}

module.exports = { runOnJudge0, JUDGE0_URL };
