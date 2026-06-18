const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const c = require('../controllers/mcq.controller');

const router = express.Router();
router.use(protect);

// ── Student endpoints ───────────────────────────────────────────────────────────
router.get('/available', c.listAvailable);
router.get('/:id/start', c.startTest);
router.post('/:id/submit', c.submitTest);

// ── Faculty/admin endpoints ───────────────────────────────────────────────────--
const faculty = authorize('faculty', 'admin');
router.get('/tests', faculty, c.listTests);
router.post('/tests', faculty, c.createTest);
router.get('/tests/:id', faculty, c.getTestFaculty);
router.put('/tests/:id/questions', faculty, c.setQuestions);
router.patch('/tests/:id/publish', faculty, c.publishTest);
router.delete('/tests/:id', faculty, c.deleteTest);
router.get('/tests/:id/results', faculty, c.getResults);

module.exports = router;
