
import * as AnswerModel from "../db/models/answer.model.js";
import QuestionModel from "../db/models/question.model.js";
import aiService from "./ai.service.js";
import * as InterviewModel from "../db/models/interview.model.js";


let marks=0;
export const createAnswer = async (
  questionId,
  answer,
  score,
  feedback
  
) => {
   
  const result= await AnswerModel.createAnswer(
    questionId,
    answer,
    score,
    feedback
  );
  return result;
};

export const getAnswerByQuestionId = async (questionId) => {
  return await AnswerModel.getAnswerByQuestionId(questionId);
};


export const getAnswersByInterview = async (interviewId) => {
  const results= await AnswerModel.getAnswersByInterview(interviewId);
  return {results,marks};
};

export const evaluateInterviewAnswers = async (interviewId) => {
  
  // Get all questions of the interview
  const questions =
    await QuestionModel.getQuestionsByInterviewId(interviewId);
    console.log(interviewId);

  const results = [];

  for (const question of questions) {

    // Get user's answer for this question
    const answer =
      await AnswerModel.getAnswerByQuestionId(question.id);
    
    // Skip unanswered questions
    if (!answer) continue;
    
    // Evaluate using Groq
    const evaluation = await aiService.evaluateAnswer(
      question.question,
      question.correct_answer,
      answer.answer
    );
    marks+=evaluation.score;
    // Save score & feedback
    const updatedAnswer =
      await AnswerModel.updateEvaluation(
        answer.id,
        evaluation.score,
        evaluation.feedback,
        question.correct_answer
      );
    results.push(updatedAnswer);
  }
  console.log("all done");
  return results;
};
