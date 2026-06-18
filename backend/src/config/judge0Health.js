const axios = require('axios');

const JUDGE0_URL = process.env.JUDGE0_URL || 'http://localhost:2358';

// Minimum safe version — patches CVE-2024-28185 and CVE-2024-28189
const MIN_VERSION = [1, 13, 1];

const parseVersion = (v) =>
  String(v || '').replace(/^v/, '').split('.').map(Number);

const versionAtLeast = (v) => {
  const [ma, mi, pa] = parseVersion(v);
  const [rma, rmi, rpa] = MIN_VERSION;
  if (ma !== rma) return ma > rma;
  if (mi !== rmi) return mi > rmi;
  return pa >= rpa;
};

// Security settings we require — maps field name → expected value (null = just log)
const REQUIRED = [
  { key: 'enable_network',                  field: 'ENABLE_NETWORK',                  want: false },
  { key: 'enable_compiler_options',         field: 'ENABLE_COMPILER_OPTIONS',         want: false },
  { key: 'enable_command_line_arguments',   field: 'ENABLE_COMMAND_LINE_ARGUMENTS',   want: false },
  { key: 'enable_submission_delete',        field: 'ENABLE_SUBMISSION_DELETE',        want: false },
  { key: 'enable_batched_submissions',      field: 'ENABLE_BATCHED_SUBMISSIONS',      want: true  },
  { key: 'max_queue_size',                  field: 'MAX_QUEUE_SIZE',                  want: null  },
  { key: 'stdout_limit',                    field: 'STDOUT_LIMIT',                    want: null  },
  { key: 'max_processes_and_or_threads',    field: 'MAX_PROCESSES_AND_OR_THREADS',    want: null  },
];

const checkJudge0Health = async () => {
  const headers = {};
  if (process.env.JUDGE0_AUTH_TOKEN) {
    headers['X-Auth-Token'] = process.env.JUDGE0_AUTH_TOKEN;
  }

  try {
    const res = await axios.get(`${JUDGE0_URL}/system_info`, { headers, timeout: 5000 });
    const info = res.data;

    const version = info.version || 'unknown';
    const versionOk = versionAtLeast(version);

    console.log(`\n🔒 Judge0 security check — version ${version}`);

    if (!versionOk) {
      console.error(
        `  ✗ VERSION TOO OLD (${version} < 1.13.1) — update immediately to patch CVE-2024-28185 / CVE-2024-28189`
      );
    } else {
      console.log(`  ✓ version ${version} ≥ 1.13.1 (CVE-2024-28185/28189 patched)`);
    }

    let allOk = versionOk;

    for (const { key, field, want } of REQUIRED) {
      const actual = info[key];
      if (want === null) {
        console.log(`  ✓ ${field} = ${actual}`);
      } else if (actual !== want) {
        console.warn(`  ✗ ${field} = ${actual}  (expected ${want}) — update judge0.conf`);
        allOk = false;
      } else {
        console.log(`  ✓ ${field} = ${actual}`);
      }
    }

    if (allOk) {
      console.log('  ✅ All security checks passed\n');
    } else {
      console.warn('  ⚠️  One or more security checks failed — review judge0.conf\n');
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      console.warn('  ⚠️  Judge0 not reachable at startup — submissions will fail until it starts');
    } else {
      console.warn(`  ⚠️  Judge0 health check failed: ${err.message}`);
    }
  }
};

module.exports = { checkJudge0Health };
