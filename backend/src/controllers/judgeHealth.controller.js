const axios = require('axios');

const JUDGE0_URL = process.env.JUDGE0_URL || 'http://localhost:2358';

// Auth header sent on every Judge0 request — matches AUTHN_TOKEN in judge0.conf.
// Mirrors judge0Headers() in workers/judge.worker.js.
const judge0Headers = () => {
  const token = process.env.JUDGE0_AUTH_TOKEN;
  return token ? { 'X-Auth-Token': token } : {};
};

// BullMQ submissions queue — used to report queue depth. Loaded defensively so a
// misconfigured Redis connection never takes the health endpoint down.
let submissionsQueue = null;
try {
  ({ submissionsQueue } = require('../config/queue'));
} catch (_) {
  submissionsQueue = null;
}

// Read queue depth from BullMQ if it's available; never throws.
const getQueueDepth = async () => {
  if (!submissionsQueue || typeof submissionsQueue.getJobCounts !== 'function') {
    return null;
  }
  try {
    const counts = await submissionsQueue.getJobCounts(
      'waiting', 'active', 'delayed', 'completed', 'failed'
    );
    const waiting = counts.waiting || 0;
    const active = counts.active || 0;
    const delayed = counts.delayed || 0;
    return {
      waiting,
      active,
      delayed,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      // "Depth" = work not yet finished
      depth: waiting + active + delayed,
    };
  } catch (_) {
    return null;
  }
};

// GET /api/judge-health — faculty/admin only.
// Polls Judge0 /system_info, /about and /workers. Never throws: on any failure
// it returns online:false with the error message so the dashboard can render.
exports.getHealth = async (req, res) => {
  const headers = judge0Headers();
  const checked_at = new Date().toISOString();

  let online = false;
  let version = 'unknown';
  let workers = null;
  let system_info = null;
  let errorMessage = null;

  // /system_info is the primary liveness probe.
  try {
    const sysRes = await axios.get(`${JUDGE0_URL}/system_info`, { headers, timeout: 5000 });
    system_info = sysRes.data;
    online = true;
  } catch (err) {
    errorMessage =
      err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND'
        ? `Judge0 not reachable at ${JUDGE0_URL}`
        : err.message;
  }

  // /about carries the version string. Best-effort; failure leaves version unknown.
  if (online) {
    try {
      const aboutRes = await axios.get(`${JUDGE0_URL}/about`, { headers, timeout: 5000 });
      version = aboutRes.data?.version || system_info?.version || 'unknown';
    } catch (_) {
      version = system_info?.version || 'unknown';
    }
  }

  // /workers reports per-queue worker availability. Best-effort.
  if (online) {
    try {
      const workersRes = await axios.get(`${JUDGE0_URL}/workers`, { headers, timeout: 5000 });
      workers = workersRes.data;
    } catch (_) {
      workers = null;
    }
  }

  // Queue depth from our own BullMQ queue (independent of Judge0 reachability).
  const queue = await getQueueDepth();

  return res.json({
    success: true,
    data: {
      online,
      version,
      workers,
      queue,
      system_info,
      ...(errorMessage ? { error: errorMessage } : {}),
      checked_at,
    },
  });
};
