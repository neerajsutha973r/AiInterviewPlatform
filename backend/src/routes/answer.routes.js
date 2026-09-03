import express from "express";

import verifyUser
  from "../middleware/auth.middleware.js";

import * as AnswerController
  from "../controllers/answer.controller.js";


const router = express.Router();


// ======================================================
// SUBMIT ANSWER
// ======================================================

router.post(
  "/questions/:questionId/answer",
  verifyUser,
  AnswerController.createAnswer
);


// ======================================================
// GENERATE NEXT ADAPTIVE QUESTION
// ======================================================

router.post(
  "/questions/:questionId/next",
  verifyUser,
  AnswerController.generateNextQuestion
);


// ======================================================
// GET ANSWER FOR A QUESTION
// ======================================================

router.get(
  "/questions/:questionId/answer",
  verifyUser,
  AnswerController.getAnswer
);


// ======================================================
// GET ALL ANSWERS FOR AN INTERVIEW
// ======================================================

router.get(
  "/interviews/:interviewId/answers",
  verifyUser,
  AnswerController.getInterviewAnswers
);


// ======================================================
// EVALUATE INTERVIEW ANSWERS
// ======================================================

router.post(
  "/interview/:interviewId/evaluate",
  verifyUser,
  AnswerController.evaluateInterviewAnswers
);


export default router;