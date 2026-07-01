import httpStatus from "http-status";
import * as AnswerService from "../services/answer.service.js";
import * as InterviewService from "../services/interview.service.js";

export const createAnswer = async (req, res) => {
   
  const { answer } = req.body;
  const { questionId } = req.params;

  if (!answer) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: "Answer is required",
    });
  }

  try {

    const newAnswer = await AnswerService.createAnswer(
      questionId,
      answer,
    );

    return res.status(httpStatus.CREATED).json(newAnswer);

  } catch (err) {

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: err.message,
    });

  }

};

export const getAnswer = async (req, res) => {

  try {

    const answer = await AnswerService.getAnswerByQuestionId(
      req.params.questionId
    );

    if (!answer) {
      return res.status(httpStatus.NOT_FOUND).json({
        message: "Answer not found",
      });
    }

    return res.status(httpStatus.OK).json(answer);

  } catch (err) {

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: err.message,
    });

  }

};

export const getInterviewAnswers = async (req, res) => {

  try {

    const answers =
      await AnswerService.getAnswersByInterview(
        req.params.interviewId
      );

    return res.status(httpStatus.OK).json(answers);

  } catch (err) {

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: err.message,
    });

  }

};

export const evaluateInterviewAnswers = async (req, res) => {
  const { interviewId } = req.params;
  

  try {
    
    const evaluatedAnswers =
      await AnswerService.evaluateInterviewAnswers(interviewId);

        await InterviewService.updateStatus(
      interviewId,
      "Completed"
    );

    return res.status(httpStatus.OK).json({
      message: "Interview evaluated successfully",
      data: evaluatedAnswers,
    });

  } catch (err) {

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: err.message,
    });

  }
};