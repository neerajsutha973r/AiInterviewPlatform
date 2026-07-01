import api from "./api";

const interviewService = {

  // Create Interview
  createInterview: async (interviewData) => {
    const response = await api.post("/interview", interviewData);
    return response.data;
  },

  // Get All Interviews
  getAllInterviews: async () => {
    const response = await api.get("/interview");
    return response.data;
  },

  // Get Interview By ID
  getInterviewById: async (id) => {
    const response = await api.get(`/interview/${id}`);
    return response.data;
  },

  // Delete Interview
  deleteInterview: async (id) => {
    const response = await api.delete(`/interview/${id}`);
    return response.data;
  },
  getQuestions: async (interviewId) => {
    const response = await api.get(`/interview/${interviewId}/questions`);
    return response.data;
  },

  submitAnswer: async (questionId, answer) => {
     const response = await api.post(
    `/answer/questions/${questionId}/answer`,
    { answer }
   );

  return response.data;
},
 
 startInterview: async (id) => {

    const response = await api.post(`/interview/${id}/start`);

    return response.data;

},

evaluateInterview: async (interviewId) => {
  const response = await api.post(
    `/answer/interview/${interviewId}/evaluate`
  );

  return response.data;
},

getInterviewAnswers: async (interviewId) => {
  const response = await api.get(
    `/answer/interviews/${interviewId}/answers`
  );

  return response.data;
}

};



export default interviewService;