import * as InterviewModel from "../db/models/interview.model.js";

export const createInterview = async (userId, interviewData) => {
  return await InterviewModel.createInterview(
    userId,
    interviewData.title,
    interviewData.role,
    interviewData.difficulty
  );
};

export const getAllInterviews = async (userId) => {
  return await InterviewModel.getAllInterviews(userId);
};

export const getInterviewById = async (id) => {
  return await InterviewModel.getInterviewById(id);
};

export const deleteInterview = async (id) => {
  return await InterviewModel.deleteInterview(id);
};

 export const updateStatus = async (id, status) => {

   return  await InterviewModel.updateStatus(id, status);

};