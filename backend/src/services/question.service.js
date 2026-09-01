import QuestionModel from "../db/models/question.model.js";

const createQuestion = async (
  interviewId,
  question,
  correctAnswer,
  order,
  embedding
) => {

  return await QuestionModel.createQuestion(
    interviewId,
    question,
    correctAnswer,
    order,
    embedding
  );
};

const getQuestionsByInterviewId = async (interviewId) => {

  return await QuestionModel.getQuestionsByInterviewId(
    interviewId
  );
};

const getQuestionById = async (questionId) => {

  return await QuestionModel.getQuestionById(
    questionId
  );
};

export default {
  createQuestion,
  getQuestionsByInterviewId,
  getQuestionById,
};