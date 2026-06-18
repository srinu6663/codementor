const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/auth.middleware');
const c = require('../controllers/profiles.controller');

const router = express.Router();
router.use(protect);

// Live syncs hit external APIs — cap per user to be a good citizen.
const syncLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id || 'anon',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many syncs. Please wait a few minutes.' },
});

router.get('/me', c.getMine);
router.put('/me', c.setHandle);
router.post('/me/sync', syncLimiter, c.syncMine);
router.get('/leaderboard', c.getLeaderboard);

module.exports = router;
