const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { requirePermission } = require('../middleware/permissions');
const c = require('../controllers/rating.controller');

const router = express.Router();

// All rating routes require an authenticated user.
router.use(protect);

// ── Faculty / admin: recompute ratings for a finished contest ──────────────────
router.post('/contest/:id/recompute',
  authorize('faculty', 'admin'),
  requirePermission('manage_contests'),
  c.recomputeForContest
);

// ── Public (authenticated) ─────────────────────────────────────────────────────
router.get('/leaderboard', c.getRatingLeaderboard);
router.get('/user/:userId', c.getUserRating);

module.exports = router;
