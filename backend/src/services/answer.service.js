import * as AnswerModel
  from "../db/models/answer.model.js";

import QuestionModel
  from "../db/models/question.model.js";

import QuestionService
  from "./question.service.js";

import * as aiService
  from "./ai.service.js";

import * as InterviewModel
  from "../db/models/interview.model.js";


// ======================================================
// CREATE ANSWER
// ======================================================

export const createAnswer = async (
  questionId,
  answer
) => {

  const question =
    await QuestionModel.getQuestionById(
      questionId
    );


  if (!question) {

    throw new Error(
      "Question not found"
    );

  }


  const interview =
    await InterviewModel.getInterviewById(
      question.interview_id
    );


  if (!interview) {

    throw new Error(
      "Interview not found"
    );

  }


  if (
    interview.status === "Completed"
  ) {

    throw new Error(
      "Interview is already completed"
    );

  }


  const existingAnswer =
    await AnswerModel.getAnswerByQuestionId(
      questionId
    );


  if (existingAnswer) {

    throw new Error(
      "This question has already been answered"
    );

  }


  // ====================================================
  // EVALUATE ANSWER
  // ====================================================

  const evaluation =
    await aiService.evaluateAnswer(

      question.question,

      question.correct_answer,

      answer

    );


  console.log(
    "Candidate score:",
    evaluation.score
  );


  // ====================================================
  // INTERVIEWER RESPONSE
  // ====================================================

  const interviewerResponse =
    await aiService.generateInterviewerResponse(

      question.question,

      answer,

      evaluation.score

    );


  console.log(
    "Interviewer response:",
    interviewerResponse
  );


  // ====================================================
  // SAVE ANSWER
  // ====================================================

  const savedAnswer =
    await AnswerModel.createAnswer(

      questionId,

      answer,

      evaluation.score,

      evaluation.feedback

    );


  // ====================================================
  // GET CURRENT QUESTIONS
  // ====================================================

  const existingQuestions =
    await QuestionModel.getQuestionsByInterviewId(
      interview.id
    );


  // ====================================================
  // FINAL QUESTION
  // ====================================================

  if (
    interview.total_questions &&
    existingQuestions.length >=
      interview.total_questions
  ) {


    // Complete interview
    await InterviewModel.updateStatus(
      interview.id,
      "Completed"
    );


    // Generate closing message
    const closing =
      await aiService.generateInterviewClosing(

        interview.role,

        interview.total_questions

      );


    return {

      answer:
        savedAnswer,

      interviewerResponse:
        interviewerResponse,

      closing:
        closing,

      interviewCompleted:
        true,

      nextQuestion:
        null,

      message:
        "Interview completed",

    };

  }


  // ====================================================
  // NORMAL QUESTION
  // ====================================================

  return {

    answer:
      savedAnswer,

    interviewerResponse:
      interviewerResponse,

    interviewCompleted:
      false,

    nextQuestion:
      null,

  };

};


// ======================================================
// GENERATE NEXT QUESTION
// ======================================================

export const generateNextQuestion = async (
  questionId
) => {

  const question =
    await QuestionModel.getQuestionById(
      questionId
    );


  if (!question) {

    throw new Error(
      "Question not found"
    );

  }


  const interview =
    await InterviewModel.getInterviewById(
      question.interview_id
    );


  if (!interview) {

    throw new Error(
      "Interview not found"
    );

  }


  const answer =
    await AnswerModel.getAnswerByQuestionId(
      questionId
    );


  if (!answer) {

    throw new Error(
      "Answer must be submitted before generating next question"
    );

  }


  const existingQuestions =
    await QuestionModel.getQuestionsByInterviewId(
      interview.id
    );


  if (
    interview.total_questions &&
    existingQuestions.length >=
      interview.total_questions
  ) {

    return {

      interviewCompleted:
        true,

      nextQuestion:
        null,

    };

  }


  // ====================================================
  // GENERATE NEXT ADAPTIVE QUESTION
  // ====================================================

  const nextQuestion =
    await aiService.generateNextQuestion({

      userId:
        interview.user_id,

      role:
        interview.role,

      difficulty:
        question.question_difficulty ||
        interview.difficulty,

      previousQuestion:
        question.question,

      previousAnswer:
        answer.answer,

      previousScore:
        answer.score,

      previousSkill:
        question.skill,

      previousTopic:
        question.topic,

    });


  if (
    nextQuestion.rejected
  ) {

    return {

      interviewCompleted:
        false,

      nextQuestion:
        null,

      rejected:
        true,

      message:
        "Could not generate a unique next question",

    };

  }


  const nextOrder =
    existingQuestions.length + 1;


  const savedQuestion =
    await QuestionService.createQuestion(

      interview.id,

      nextQuestion.question,

      nextQuestion.correct_answer,

      nextOrder,

      nextQuestion.embedding,

      nextQuestion.skill,

      nextQuestion.topic,

      nextQuestion.question_type,

      nextQuestion.difficulty

    );


  return {

    interviewCompleted:
      false,

    nextQuestion: {

      id:
        savedQuestion.id,

      question:
        savedQuestion.question,

      question_order:
        savedQuestion.question_order,

      skill:
        nextQuestion.skill,

      topic:
        nextQuestion.topic,

      question_type:
        nextQuestion.question_type,

      difficulty:
        nextQuestion.difficulty,

    },

  };

};


// ======================================================
// GET ANSWER BY QUESTION ID
// ======================================================

export const getAnswerByQuestionId = async (
  questionId
) => {

  return await AnswerModel.getAnswerByQuestionId(
    questionId
  );

};


// ======================================================
// GET ALL ANSWERS FOR INTERVIEW
// ======================================================

export const getAnswersByInterview = async (
  interviewId
) => {

  return await AnswerModel.getAnswersByInterview(
    interviewId
  );

};


// ======================================================
// EVALUATE INTERVIEW ANSWERS
// ======================================================

export const evaluateInterviewAnswers = async (
  interviewId
) => {

  const questions =
    await QuestionModel.getQuestionsByInterviewId(
      interviewId
    );


  const results = [];


  for (
    const question of questions
  ) {

    const answer =
      await AnswerModel.getAnswerByQuestionId(
        question.id
      );


    if (!answer) {

      continue;

    }


    if (
      answer.score !== null
    ) {

      results.push(
        answer
      );

      continue;

    }


    const evaluation =
      await aiService.evaluateAnswer(

        question.question,

        question.correct_answer,

        answer.answer

      );


    const updatedAnswer =
      await AnswerModel.updateEvaluation(

        answer.id,

        evaluation.score,

        evaluation.feedback,

        question.correct_answer

      );


    results.push(
      updatedAnswer
    );

  }


  return results;

};