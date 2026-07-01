import express from "express";
import * as InterviewController from "../controllers/interview.controller.js";
import verifyuser from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/",verifyuser,InterviewController.createInterview);

router.get("/", verifyuser, InterviewController.getAllInterviews);

router.get("/:id", verifyuser, InterviewController.getInterviewById);

router.delete("/:id", verifyuser, InterviewController.deleteInterview);

router.post("/:id/start",verifyuser,InterviewController.startInterview);

router.get("/:id/questions",verifyuser,InterviewController.getQuestions);

export default router;