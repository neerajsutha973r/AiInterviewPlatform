import * as InterviewModel
  from "../db/models/interview.model.js";


// ======================================================
// CREATE INTERVIEW
// ======================================================

export const createInterview = async (
  userId,
  interviewData
) => {

  const {
    title,
    role,
    difficulty,

    // Default to 5 if frontend doesn't send it
    total_questions = 5,

  } = interviewData;


  const totalQuestions =
    Number(total_questions);


  // Validate
  if (
    !Number.isInteger(totalQuestions) ||
    totalQuestions <= 0
  ) {

    throw new Error(
      "total_questions must be a positive integer"
    );

  }


  return await InterviewModel.createInterview(

    userId,

    title,

    role,

    difficulty,

    totalQuestions

  );
};


// ======================================================
// GET ALL INTERVIEWS
// ======================================================

export const getAllInterviews = async (
  userId
) => {

  return await InterviewModel.getAllInterviews(
    userId
  );

};


// ======================================================
// GET INTERVIEW BY ID
// ======================================================

export const getInterviewById = async (
  id
) => {

  return await InterviewModel.getInterviewById(
    id
  );

};


// ======================================================
// DELETE INTERVIEW
// ======================================================

export const deleteInterview = async (
  id
) => {

  return await InterviewModel.deleteInterview(
    id
  );

};


// ======================================================
// UPDATE STATUS
// ======================================================

export const updateStatus = async (
  id,
  status
) => {

  return await InterviewModel.updateStatus(
    id,
    status
  );

};