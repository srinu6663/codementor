const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { exportProblemPdf, exportQuestionPaper, exportClassReport } = require('../controllers/pdfExport.controller');

const router = express.Router();

// Faculty/admin only — export problems and question papers as PDF.
router.get('/problems/:id/pdf', protect, authorize('faculty', 'admin'), exportProblemPdf);
router.post('/question-paper', protect, authorize('faculty', 'admin'), exportQuestionPaper);
router.get('/class-report', protect, authorize('faculty', 'admin'), exportClassReport);

module.exports = router;
