const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const aiController = require('../controllers/ai.controller');

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many AI requests. Please wait a moment.' }
});

router.post('/tutor', authMiddleware.protect, aiLimiter, aiController.askTutor);
router.get('/tutor/:problemId', authMiddleware.protect, aiController.getHistory);
router.post('/explain-error', authMiddleware.protect, aiLimiter, aiController.explainError);
router.post('/review-code', authMiddleware.protect, aiLimiter, aiController.reviewCode);

module.exports = router;
