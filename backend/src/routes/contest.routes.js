const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { requirePermission } = require('../middleware/permissions');
const c = require('../controllers/contest.controller');

const router = express.Router();

// ── Public (authenticated) ────────────────────────────────────────────────────
router.get('/',          protect, c.listContests);
router.get('/:id',       protect, c.getContest);
router.post('/:id/register',         protect, c.register);
router.get('/:id/scoreboard',        protect, c.getScoreboard);
router.post('/:id/virtual',          protect, c.startVirtual);
router.get('/:id/virtual/scoreboard', protect, c.getVirtualScoreboard);

// ── Faculty only ──────────────────────────────────────────────────────────────
router.post('/',
  protect, authorize('faculty', 'admin'), requirePermission('manage_contests'),
  c.createContest
);
router.patch('/:id/scoreboard-mode',
  protect, authorize('faculty', 'admin'), requirePermission('manage_contests'),
  c.updateScoreboardMode
);

module.exports = router;
