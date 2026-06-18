const express = require('express');
const {
  getProblems,
  getProblemById,
  getAdjacentProblems
} = require('../controllers/problems.controller');

const router = express.Router();

// Read-only public problem catalogue.
// NOTE: problem creation/update/deletion is handled exclusively by the
// authenticated, ownership-checked routes in faculty.routes.js
// (POST/PUT/DELETE /api/faculty/problems). The previously-exposed
// unauthenticated write routes here have been removed.
router.get('/', getProblems);

// Adjacent must be before /:id so it isn't captured as an ID.
router.get('/:id/adjacent', getAdjacentProblems);

router.get('/:id', getProblemById);

module.exports = router;
