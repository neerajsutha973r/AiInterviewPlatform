import * as AnswerService
  from "../services/answer.service.js";

import * as InterviewService
  from "../services/interview.service.js";

import QuestionModel
  from "../db/models/question.model.js";


// ======================================================
// CREATE ANSWER
// ======================================================

export const createAnswer = async (
  req,
  res
) => {

  const { answer } =
    req.body;

  const { questionId } =
    req.params;


  if (
    !answer ||
    typeof answer !== "string" ||
    !answer.trim()
  ) {

    return res.status(400).json({
      message: "Answer is required",
    });

  }


  try {

    const question =
      await QuestionModel.getQuestionById(
        questionId
      );


    if (!question) {

      return res.status(404).json({
        message: "Question not found",
      });

    }


    const interview =
      await InterviewService.getInterviewById(
        question.interview_id
      );


    if (!interview) {

      return res.status(404).json({
        message: "Interview not found",
      });

    }


    // Ownership check
    if (
      String(interview.user_id) !==
      String(req.user.id)
    ) {

      return res.status(403).json({
        message: "Access denied",
      });

    }


    const result =
      await AnswerService.createAnswer(
        questionId,
        answer.trim()
      );


    return res.status(201).json(
      result
    );


  } catch (err) {

    console.error(
      "Create answer error:",
      err
    );


    return res.status(500).json({
      message: err.message,
    });

  }

};


// ======================================================
// GET ANSWER
// ======================================================

export const getAnswer = async (
  req,
  res
) => {

  const { questionId } =
    req.params;


  try {

    const question =
      await QuestionModel.getQuestionById(
        questionId
      );


    if (!question) {

      return res.status(404).json({
        message: "Question not found",
      });

    }


    const interview =
      await InterviewService.getInterviewById(
        question.interview_id
      );


    if (!interview) {

      return res.status(404).json({
        message: "Interview not found",
      });

    }


    if (
      String(interview.user_id) !==
      String(req.user.id)
    ) {

      return res.status(403).json({
        message: "Access denied",
      });

    }


    const answer =
      await AnswerService.getAnswerByQuestionId(
        questionId
      );


    if (!answer) {

      return res.status(404).json({
        message: "Answer not found",
      });

    }


    return res.status(200).json(
      answer
    );


  } catch (err) {

    console.error(
      "Get answer error:",
      err
    );


    return res.status(500).json({
      message: err.message,
    });

  }

};


// ======================================================
// GET ALL INTERVIEW ANSWERS
// ======================================================

export const getInterviewAnswers = async (
  req,
  res
) => {

  const { interviewId } =
    req.params;


  try {

    const interview =
      await InterviewService.getInterviewById(
        interviewId
      );


    if (!interview) {

      return res.status(404).json({
        message: "Interview not found",
      });

    }


    if (
      String(interview.user_id) !==
      String(req.user.id)
    ) {

      return res.status(403).json({
        message: "Access denied",
      });

    }


    const answers =
      await AnswerService.getAnswersByInterview(
        interviewId
      );


    return res.status(200).json(
      answers
    );


  } catch (err) {

    console.error(
      "Get interview answers error:",
      err
    );


    return res.status(500).json({
      message: err.message,
    });

  }

};


// ======================================================
// EVALUATE INTERVIEW ANSWERS
// ======================================================

export const evaluateInterviewAnswers = async (
  req,
  res
) => {

  const { interviewId } =
    req.params;


  try {

    const interview =
      await InterviewService.getInterviewById(
        interviewId
      );


    if (!interview) {

      return res.status(404).json({
        message: "Interview not found",
      });

    }


    if (
      String(interview.user_id) !==
      String(req.user.id)
    ) {

      return res.status(403).json({
        message: "Access denied",
      });

    }


    const evaluatedAnswers =
      await AnswerService.evaluateInterviewAnswers(
        interviewId
      );


    await InterviewService.updateStatus(
      interviewId,
      "Completed"
    );


    return res.status(200).json({

      message:
        "Interview evaluated successfully",

      data:
        evaluatedAnswers,

    });


  } catch (err) {

    console.error(
      "Evaluate interview error:",
      err
    );


    return res.status(500).json({
      message: err.message,
    });

  }

};


// ======================================================
// GENERATE NEXT QUESTION
// ======================================================

export const generateNextQuestion = async (
  req,
  res
) => {

  const { questionId } =
    req.params;


  try {

    const question =
      await QuestionModel.getQuestionById(
        questionId
      );


    if (!question) {

      return res.status(404).json({
        message: "Question not found",
      });

    }


    const interview =
      await InterviewService.getInterviewById(
        question.interview_id
      );


    if (!interview) {

      return res.status(404).json({
        message: "Interview not found",
      });

    }


    // Ownership check
    if (
      String(interview.user_id) !==
      String(req.user.id)
    ) {

      return res.status(403).json({
        message: "Access denied",
      });

    }


    const result =
      await AnswerService.generateNextQuestion(
        questionId
      );


    return res.status(200).json(
      result
    );


  } catch (err) {

    console.error(
      "Generate next question error:",
      err
    );


    return res.status(500).json({
      message: err.message,
    });

  }

};