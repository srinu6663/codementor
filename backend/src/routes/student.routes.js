const express = require('express');
const { getDashboardData, getAssignments, getNotifications } = require('../controllers/student.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// All student routes require authentication
router.use(protect);

router.get('/dashboard', getDashboardData);
router.get('/assignments', getAssignments);
router.get('/notifications', getNotifications);

module.exports = router;
