const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const c = require('../controllers/classroom.controller');

const router = express.Router();
router.use(protect);

router.get('/', c.listClassrooms);                 // role-aware (faculty: own; student: enrolled)
router.post('/join', c.joinClassroom);             // students enroll by code
router.post('/', authorize('faculty', 'admin'), c.createClassroom);
router.get('/:id/members', authorize('faculty', 'admin'), c.getMembers);

module.exports = router;
