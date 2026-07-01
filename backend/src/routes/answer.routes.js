import express from "express";
import verifyUser from "../middleware/auth.middleware.js";
import * as AnswerController from "../controllers/answer.controller.js";

const router = express.Router();

router.post(
  "/questions/:questionId/answer",
  verifyUser,
  AnswerController.createAnswer
);

router.get(
  "/questions/:questionId/answer",
  verifyUser,
  AnswerController.getAnswer
);

router.get(
  "/interviews/:interviewId/answers",
  verifyUser,
  AnswerController.getInterviewAnswers
);

router.post(
  "/interview/:interviewId/evaluate",
  AnswerController.evaluateInterviewAnswers
);

export default router;