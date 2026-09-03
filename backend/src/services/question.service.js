import QuestionModel
  from "../db/models/question.model.js";


// ======================================================
// CREATE QUESTION
// ======================================================

const createQuestion = async (
  interviewId,
  question,
  correctAnswer,
  order,
  embedding,
  skill,
  topic,
  questionType,
  difficulty
) => {

  // Create question
  const createdQuestion =
    await QuestionModel.createQuestion(

      interviewId,

      question,

      correctAnswer,

      order,

      embedding

    );


  // Create adaptive metadata
  await QuestionModel.createQuestionMetadata(

    createdQuestion.id,

    skill,

    topic,

    questionType,

    difficulty

  );


  return createdQuestion;
};


// ======================================================
// GET QUESTIONS BY INTERVIEW
// ======================================================

const getQuestionsByInterviewId = async (
  interviewId
) => {

  return await QuestionModel
    .getQuestionsByInterviewId(
      interviewId
    );

};


// ======================================================
// GET QUESTION BY ID
// ======================================================

const getQuestionById = async (
  questionId
) => {

  return await QuestionModel
    .getQuestionById(
      questionId
    );

};


// ======================================================
// EXPORT
// ======================================================

export default {

  createQuestion,

  getQuestionsByInterviewId,

  getQuestionById,

};