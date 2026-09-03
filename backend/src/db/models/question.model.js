import db from "../connection.js";


// ======================================================
// CREATE QUESTION
// ======================================================

const createQuestion = async (
  interviewId,
  question,
  correct_answer,
  questionOrder,
  embedding
) => {

  const result = await db.query(
    `
    INSERT INTO questions
    (
      interview_id,
      question,
      correct_answer,
      question_order,
      embedding
    )
    VALUES
    (
      $1,
      $2,
      $3,
      $4,
      $5::vector
    )
    RETURNING *
    `,
    [
      interviewId,
      question,
      correct_answer,
      questionOrder,
      JSON.stringify(embedding)
    ]
  );

  return result.rows[0];
};


// ======================================================
// CREATE QUESTION METADATA
// ======================================================

const createQuestionMetadata = async (
  questionId,
  skill,
  topic,
  questionType,
  difficulty
) => {

  const result = await db.query(
    `
    INSERT INTO question_metadata
    (
      question_id,
      skill,
      topic,
      question_type,
      difficulty
    )
    VALUES
    (
      $1,
      $2,
      $3,
      $4,
      $5
    )
    RETURNING *
    `,
    [
      questionId,
      skill,
      topic,
      questionType,
      difficulty
    ]
  );

  return result.rows[0];
};


// ======================================================
// GET QUESTIONS BY INTERVIEW
// ======================================================

const getQuestionsByInterviewId = async (
  interviewId
) => {

  const result = await db.query(
    `
    SELECT
      q.*,

      qm.skill,
      qm.topic,
      qm.question_type,
      qm.difficulty AS question_difficulty

    FROM questions q

    LEFT JOIN question_metadata qm
      ON q.id = qm.question_id

    WHERE q.interview_id = $1

    ORDER BY q.question_order
    `,
    [interviewId]
  );

  return result.rows;
};


// ======================================================
// GET QUESTION BY ID
// ======================================================

const getQuestionById = async (
  questionId
) => {

  const result = await db.query(
    `
    SELECT
      q.*,

      qm.skill,
      qm.topic,
      qm.question_type,
      qm.difficulty AS question_difficulty

    FROM questions q

    LEFT JOIN question_metadata qm
      ON q.id = qm.question_id

    WHERE q.id = $1
    `,
    [questionId]
  );

  return result.rows[0];
};


// ======================================================
// EXPORT
// ======================================================

export default {

  createQuestion,

  createQuestionMetadata,

  getQuestionsByInterviewId,

  getQuestionById,

};