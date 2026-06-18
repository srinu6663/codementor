const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const c = require('../controllers/proctor.controller');

const router = express.Router();
router.use(protect);

router.post('/event', c.recordEvent);
router.get('/assignment/:id', authorize('faculty', 'admin'), c.getAssignmentReport);

module.exports = router;
