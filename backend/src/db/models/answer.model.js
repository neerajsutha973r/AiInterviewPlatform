import db from "../connection.js";

export const createAnswer = async (
  questionId,
  answer,
  score = null,
  feedback = null
) => {
  try{

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
      $1, $2, $3, $4
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
} catch(err){
  console.log(err);
  throw err;
}
};

export const getAnswerByQuestionId = async (questionId) => {
  try{
  const result = await db.query(
    `
    SELECT *
    FROM answers
    WHERE question_id = $1
    `,
    [questionId]
  );

  return result.rows[0];
} catch(err){
  console.log(err);
  throw err;
}
};

export const getAnswersByInterview = async (interviewId) => {
   try{
  const result = await db.query(
    `
    SELECT
    q.id AS question_id,
    q.question,
    q.correct_answer,
    q.question_order,
    a.id AS answer_id,
    a.answer,
    a.score,
    a.feedback
    FROM questions q
    LEFT JOIN answers a
      ON q.id = a.question_id
    WHERE q.interview_id = $1
    ORDER BY q.question_order
    `,
    [interviewId]
  );

  return result.rows;
  } catch(err){
  console.log(err);
  throw err;
}
};

export const updateEvaluation = async (
  answerId,
  score,
  feedback,
  correct_answer
) => {
  try{
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
      correct_answer
    ]
  );

  return result.rows[0];
  } catch(err){
  console.log(err);
  throw err;
}
};


