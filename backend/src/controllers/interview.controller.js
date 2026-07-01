import * as InterviewService from "../services/interview.service.js";
import aiService from "../services/ai.service.js";
import QuestionService from "../services/question.service.js";

export const createInterview = async (req, res) => {
  try {
    const interview = await InterviewService.createInterview(
      req.user.id,
      req.body
    );

    res.status(201).json(interview);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

export const getAllInterviews = async (req, res) => {
  try {
    const interviews = await InterviewService.getAllInterviews(req.user.id);

    res.json(interviews);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

export const getInterviewById = async (req, res) => {
  try {
    const interview = await InterviewService.getInterviewById(req.params.id);

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    res.json(interview);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

export const deleteInterview = async (req, res) => {
  try {
    const interview = await InterviewService.deleteInterview(req.params.id);

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    res.json({
      message: "Interview deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }

};


export const startInterview = async (req, res) => {

  try {

    const interview = await InterviewService.getInterviewById(
      req.params.id
    );

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    const questions = await aiService.generateQuestions(
     interview.role,
     interview.difficulty
     );
     
  for (let i = 0; i < questions.length; i++) {
    await QuestionService.createQuestion(
        interview.id,
        questions[i].question,
        questions[i].correct_answer,
        i + 1
    );
}
 
  await InterviewService.updateStatus(
    interview.id,
    "In Progress"
   );

   return res.status(200).json({
    message: "Interview Started",
    totalQuestions: questions.length
});

  }  catch (err) {

  console.error(err);

  return res.status(500).json({
    message: err.message,
  });

}
};
  


export const getQuestions = async (req, res) => {

  try {

    const questions =
      await QuestionService.getQuestionsByInterviewId(
        req.params.id
      );

    return res.status(200).json(questions);

  } catch (err) {

    return res.status(500).json({
      message: err.message,
    });

  }

};
