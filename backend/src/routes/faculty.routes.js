const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const facultyController = require('../controllers/faculty.controller');

const router = express.Router();

// All faculty routes require authentication AND the 'faculty' or 'admin' role
router.use(protect);
router.use(authorize('faculty', 'admin'));

router.get('/dashboard', facultyController.getDashboardData);
router.post('/assignments', facultyController.createAssignment);
router.get('/assignments/:id/submissions', facultyController.getAssignmentSubmissions);
router.get('/assignments/:id/export', facultyController.exportMarksCSV);
router.post('/problems', facultyController.createProblem);
router.post('/ai/generate-tests', facultyController.generateAITestCases);

module.exports = router;
