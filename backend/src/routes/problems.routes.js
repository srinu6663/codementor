const express = require('express');
const {
  getProblems,
  getProblemById,
  createProblem,
  updateProblem,
  deleteProblem
} = require('../controllers/problems.controller');

const router = express.Router();

router.route('/')
  .get(getProblems)
  .post(createProblem);

router.route('/:id')
  .get(getProblemById)
  .put(updateProblem)
  .delete(deleteProblem);

module.exports = router;
