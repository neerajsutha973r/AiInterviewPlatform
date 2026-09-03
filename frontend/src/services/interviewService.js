import api from "./api";


const interviewService = {

  // ==================================================
  // CREATE INTERVIEW
  // ==================================================

  createInterview: async (interviewData) => {

    const response =
      await api.post(
        "/interview",
        interviewData
      );

    return response.data;

  },


  // ==================================================
  // GET ALL INTERVIEWS
  // ==================================================

  getAllInterviews: async () => {

    const response =
      await api.get(
        "/interview"
      );

    return response.data;

  },


  // ==================================================
  // GET INTERVIEW BY ID
  // ==================================================

  getInterviewById: async (id) => {

    const response =
      await api.get(
        `/interview/${id}`
      );

    return response.data;

  },


  // ==================================================
  // DELETE INTERVIEW
  // ==================================================

  deleteInterview: async (id) => {

    const response =
      await api.delete(
        `/interview/${id}`
      );

    return response.data;

  },


  // ==================================================
  // GET QUESTIONS
  // ==================================================

  getQuestions: async (interviewId) => {

    const response =
      await api.get(
        `/interview/${interviewId}/questions`
      );

    return response.data;

  },


  // ==================================================
  // START INTERVIEW
  // ==================================================

  startInterview: async (id) => {

    const response =
      await api.post(
        `/interview/${id}/start`
      );

    return response.data;

  },


  // ==================================================
  // SUBMIT ANSWER
  // ==================================================
  // This now:
  // 1. Evaluates the answer
  // 2. Saves the answer
  // 3. Generates interviewer response
  //
  // It DOES NOT generate the next question.
  // ==================================================

  submitAnswer: async (
    questionId,
    answer
  ) => {

    const response =
      await api.post(

        `/answer/questions/${questionId}/answer`,

        {
          answer
        }

      );

    return response.data;

  },


  // ==================================================
  // GENERATE NEXT QUESTION
  // ==================================================
  // This is a separate API call because question
  // generation may require multiple Gemini attempts.
  // ==================================================

  generateNextQuestion: async (
    questionId
  ) => {

    const response =
      await api.post(

        `/answer/questions/${questionId}/next`

      );

    return response.data;

  },


  // ==================================================
  // EVALUATE INTERVIEW
  // ==================================================
  // Kept for compatibility with your existing backend.
  // Normal adaptive interviews do not need to call this
  // after every question.
  // ==================================================

  evaluateInterview: async (
    interviewId
  ) => {

    const response =
      await api.post(

        `/answer/interview/${interviewId}/evaluate`

      );

    return response.data;

  },


  // ==================================================
  // GET INTERVIEW ANSWERS
  // ==================================================

  getInterviewAnswers: async (
    interviewId
  ) => {

    const response =
      await api.get(

        `/answer/interviews/${interviewId}/answers`

      );

    return response.data;

  }

};


export default interviewService;