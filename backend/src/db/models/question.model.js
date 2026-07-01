import db from "../connection.js";

const createQuestion = async (
  interviewId,
  question,
  correct_answer,
  questionOrder
  
) => {

  const result = await db.query(
    `
    INSERT INTO questions
    (
      interview_id,
      question,
      correct_answer,
      question_order

    )
    VALUES
    (
      $1,$2,$3,$4
    )
    RETURNING *
    `,
    [interviewId, question, correct_answer,questionOrder]
  );

  return result.rows[0];
};

const getQuestionsByInterviewId = async (interviewId) => {

  const result = await db.query(
    `
    SELECT *
    FROM questions
    WHERE interview_id = $1
    ORDER BY question_order
    `,
    [interviewId]
  );

  return result.rows;
};


const getQuestionById = async (questionId) => {

  const result = await db.query(
    `
    SELECT *
    FROM questions
    WHERE id = $1
    `,
    [questionId]
  );

  return result.rows[0];
};

export default {
  createQuestion,
  getQuestionsByInterviewId,
  getQuestionById
};
