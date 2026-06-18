const rateLimitPkg = require('express-rate-limit');
const rateLimit = rateLimitPkg.rateLimit || rateLimitPkg;
// IPv6-safe IP key helper (normalises IPv6 into a /56 subnet bucket).
// Named `ipKeyGenerator` so express-rate-limit's validator recognises the call.
const ipKeyGenerator = rateLimitPkg.ipKeyGenerator || ((ip) => ip);
const jwt = require('jsonwebtoken');

// Extract user_id from JWT without throwing — used as the rate-limit key.
const getUserId = (req) => {
  try {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
      return decoded.id;
    }
  } catch { /* invalid/expired token — treat as anonymous */ }
  return null;
};

// Key: authenticated users keyed by userId, anonymous by IP.
// This prevents a student from burning through limits by switching IPs,
// and stops one anonymous IP from blocking other users on the same network.
const submissionKey = (req) => {
  const userId = getUserId(req);
  return userId ? `user:${userId}` : `ip:${ipKeyGenerator(req.ip)}`;
};

const rateLimitResponse = (windowSec, msg) => ({
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: msg },
  // In-memory store is fine for a single-server deployment.
  // For multi-instance: swap in a RedisStore (rate-limit-redis package).
});

// ── Submission limiters (applied in sequence on POST /api/submit) ────────────

// Layer 1 — burst: at most 1 submission every 10 s per user/IP.
// Stops rapid-fire spam even if the sustained cap hasn't been hit yet.
const submitBurstLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 1,
  keyGenerator: submissionKey,
  skipSuccessfulRequests: false,
  ...rateLimitResponse(10, 'Please wait 10 seconds between submissions.'),
});

// Layer 2 — sustained: 20/min for authenticated users, 10/min for anonymous.
// Authenticated students get a higher limit; anonymous/test traffic gets less.
const submitSustainedLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => (getUserId(req) ? 20 : 10),
  keyGenerator: submissionKey,
  skipSuccessfulRequests: false,
  ...rateLimitResponse(60, 'Submission rate limit exceeded. Please wait before trying again.'),
});

// ── General API limiter (applied globally on all /api routes) ────────────────
// Protects non-submission endpoints from scraping and brute-force enumeration.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  skipSuccessfulRequests: false,
  ...rateLimitResponse(60, 'Too many requests. Please slow down.'),
});

module.exports = { submitBurstLimiter, submitSustainedLimiter, apiLimiter };
