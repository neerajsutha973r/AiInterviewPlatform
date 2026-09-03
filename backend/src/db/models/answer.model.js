import db from "../connection.js";


// Create answer
export const createAnswer = async (
  questionId,
  answer,
  score = null,
  feedback = null
) => {

  try {

    const result = await db.query(
      `
      INSERT INTO answers
      (
        question_id,
        answer,
        score,
        feedback
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4
      )
      RETURNING *
      `,
      [
        questionId,
        answer,
        score,
        feedback
      ]
    );

    return result.rows[0];

  } catch (err) {

    console.log(
      "Create answer error:",
      err
    );

    throw err;
  }
};


// Get answer for a question
export const getAnswerByQuestionId = async (
  questionId
) => {

  try {

    const result = await db.query(
      `
      SELECT
        a.*,
        q.question,
        q.correct_answer,
        q.interview_id,
        q.question_order,

        qm.skill,
        qm.topic,
        qm.question_type,
        qm.difficulty AS question_difficulty

      FROM answers a

      JOIN questions q
        ON a.question_id = q.id

      LEFT JOIN question_metadata qm
        ON q.id = qm.question_id

      WHERE a.question_id = $1
      `,
      [questionId]
    );

    return result.rows[0];

  } catch (err) {

    console.log(
      "Get answer error:",
      err
    );

    throw err;
  }
};


// Get all answers for an interview
export const getAnswersByInterview = async (
  interviewId
) => {

  try {

    const result = await db.query(
      `
      SELECT
        q.id AS question_id,
        q.question,
        q.correct_answer,
        q.question_order,

        qm.skill,
        qm.topic,
        qm.question_type,
        qm.difficulty AS question_difficulty,

        a.id AS answer_id,
        a.answer,
        a.score,
        a.feedback,
        a.created_at AS answer_created_at

      FROM questions q

      LEFT JOIN question_metadata qm
        ON q.id = qm.question_id

      LEFT JOIN answers a
        ON q.id = a.question_id

      WHERE q.interview_id = $1

      ORDER BY q.question_order
      `,
      [interviewId]
    );

    return result.rows;

  } catch (err) {

    console.log(
      "Get interview answers error:",
      err
    );

    throw err;
  }
};


// Update answer evaluation
export const updateEvaluation = async (
  answerId,
  score,
  feedback,
  correctAnswer
) => {

  try {

    const result = await db.query(
      `
      UPDATE answers
      SET
        score = $2,
        feedback = $3,
        correct_answer = $4
      WHERE id = $1
      RETURNING *
      `,
      [
        answerId,
        score,
        feedback,
        correctAnswer
      ]
    );

    return result.rows[0];

  } catch (err) {

    console.log(
      "Update evaluation error:",
      err
    );

    throw err;
  }
};