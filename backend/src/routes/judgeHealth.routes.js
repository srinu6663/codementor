const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { getHealth } = require('../controllers/judgeHealth.controller');

const router = express.Router();

// GET /api/judge-health — faculty/admin only
router.get('/', protect, authorize('faculty', 'admin'), getHealth);

module.exports = router;
