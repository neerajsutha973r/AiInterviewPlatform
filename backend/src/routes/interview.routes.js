import express from "express";

import * as InterviewController
  from "../controllers/interview.controller.js";

import verifyuser
  from "../middleware/auth.middleware.js";


const router = express.Router();


// Create interview
router.post(
  "/",
  verifyuser,
  InterviewController.createInterview
);


// Get all interviews for current user
router.get(
  "/",
  verifyuser,
  InterviewController.getAllInterviews
);


// Get single interview
router.get(
  "/:id",
  verifyuser,
  InterviewController.getInterviewById
);


// Delete interview
router.delete(
  "/:id",
  verifyuser,
  InterviewController.deleteInterview
);


// Start interview
router.post(
  "/:id/start",
  verifyuser,
  InterviewController.startInterview
);


// Get questions for interview
router.get(
  "/:id/questions",
  verifyuser,
  InterviewController.getQuestions
);


export default router;