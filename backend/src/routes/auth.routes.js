const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, refresh } = require('../controllers/auth.controller');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts, please try again after 15 minutes.' }
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many refresh attempts.' }
});

// Input validation middleware
const validateAuth = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || typeof email !== 'string' || email.length > 254) {
    return res.status(400).json({ success: false, error: 'Valid email is required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format.' });
  }
  if (!password || typeof password !== 'string' || password.length < 6 || password.length > 128) {
    return res.status(400).json({ success: false, error: 'Password must be 6–128 characters.' });
  }
  next();
};

router.post('/register', authLimiter, validateAuth, register);
router.post('/login', authLimiter, validateAuth, login);
router.post('/refresh', refreshLimiter, refresh);

module.exports = router;
