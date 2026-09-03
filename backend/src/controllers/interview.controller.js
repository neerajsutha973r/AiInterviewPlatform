import * as InterviewService from "../services/interview.service.js";
import * as aiService from "../services/ai.service.js";;
import QuestionService from "../services/question.service.js";


// Create interview
export const createInterview = async (req, res) => {

  try {

    const interview =
      await InterviewService.createInterview(
        req.user.id,
        req.body
      );

    return res.status(201).json(
      interview
    );

  } catch (err) {

    console.error(
      "Create interview error:",
      err
    );

    return res.status(500).json({
      message: err.message,
    });

  }
};


// Get all interviews for current user
export const getAllInterviews = async (req, res) => {

  try {

    const interviews =
      await InterviewService.getAllInterviews(
        req.user.id
      );

    return res.status(200).json(
      interviews
    );

  } catch (err) {

    console.error(
      "Get interviews error:",
      err
    );

    return res.status(500).json({
      message: err.message,
    });

  }
};


// Get one interview
export const getInterviewById = async (req, res) => {

  try {

    const interview =
      await InterviewService.getInterviewById(
        req.params.id
      );


    if (!interview) {

      return res.status(404).json({
        message: "Interview not found",
      });

    }


    // Check ownership
    if (
      String(interview.user_id) !==
      String(req.user.id)
    ) {

      return res.status(403).json({
        message: "Access denied",
      });

    }


    return res.status(200).json(
      interview
    );

  } catch (err) {

    console.error(
      "Get interview error:",
      err
    );

    return res.status(500).json({
      message: err.message,
    });

  }
};


// Delete interview
export const deleteInterview = async (req, res) => {

  try {

    const interview =
      await InterviewService.getInterviewById(
        req.params.id
      );


    if (!interview) {

      return res.status(404).json({
        message: "Interview not found",
      });

    }


    // Check ownership
    if (
      String(interview.user_id) !==
      String(req.user.id)
    ) {

      return res.status(403).json({
        message: "Access denied",
      });

    }


    await InterviewService.deleteInterview(
      req.params.id
    );


    return res.status(200).json({
      message: "Interview deleted successfully",
    });

  } catch (err) {

    console.error(
      "Delete interview error:",
      err
    );

    return res.status(500).json({
      message: err.message,
    });

  }
};


// Start interview
export const startInterview = async (req, res) => {

  try {

    const interview =
      await InterviewService.getInterviewById(
        req.params.id
      );


    if (!interview) {

      return res.status(404).json({
        message: "Interview not found",
      });

    }


    // Check ownership
    if (
      String(interview.user_id) !==
      String(req.user.id)
    ) {

      return res.status(403).json({
        message: "Access denied",
      });

    }


    /*
      Prevent starting a completed interview.
    */
    if (
      interview.status === "Completed"
    ) {

      return res.status(400).json({
        message: "Interview is already completed",
      });

    }


    /*
      Check whether questions already exist.
    */
    const existingQuestions =
      await QuestionService.getQuestionsByInterviewId(
        interview.id
      );


    /*
      Prevent generating Q1 multiple times.
    */
    if (existingQuestions.length > 0) {

      return res.status(400).json({
        message: "Interview has already been started",
      });

    }


    /*
      Generate first question.
    */
    const question =
      await aiService.generateNextQuestion({

        userId:
          req.user.id,

        role:
          interview.role,

        difficulty:
          interview.difficulty,

      });


    /*
      Question was too similar
      to user's previous questions.
    */
    if (question.rejected) {

      return res.status(500).json({
        message:
          "Could not generate a unique question",
      });

    }


    /*
      Save question + metadata.
    */
    const savedQuestion =
      await QuestionService.createQuestion(

        interview.id,

        question.question,

        question.correct_answer,

        1,

        question.embedding,

        question.skill,

        question.topic,

        question.question_type,

        question.difficulty

      );


    /*
      Mark interview as in progress.
    */
    await InterviewService.updateStatus(
      interview.id,
      "In Progress"
    );


    return res.status(200).json({

      message:
        "Interview Started",

      question: {

        id:
          savedQuestion.id,

        question:
          savedQuestion.question,

        question_order:
          savedQuestion.question_order,

        skill:
          question.skill,

        topic:
          question.topic,

        question_type:
          question.question_type,

        difficulty:
          question.difficulty,

      },

    });

  } catch (err) {

    console.error(
      "Start interview error:",
      err
    );

    return res.status(500).json({
      message: err.message,
    });

  }
};


// Get questions for an interview
export const getQuestions = async (req, res) => {

  try {

    /*
      First check that interview exists.
    */
    const interview =
      await InterviewService.getInterviewById(
        req.params.id
      );


    if (!interview) {

      return res.status(404).json({
        message: "Interview not found",
      });

    }


    /*
      Check ownership.
    */
    if (
      String(interview.user_id) !==
      String(req.user.id)
    ) {

      return res.status(403).json({
        message: "Access denied",
      });

    }


    const questions =
      await QuestionService.getQuestionsByInterviewId(
        req.params.id
      );


    return res.status(200).json(
      questions
    );

  } catch (err) {

    console.error(
      "Get questions error:",
      err
    );

    return res.status(500).json({
      message: err.message,
    });

  }
};