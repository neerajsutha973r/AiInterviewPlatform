import db from "../connection.js";


// ======================================================
// CREATE INTERVIEW
// ======================================================

export const createInterview = async (
  userId,
  title,
  role,
  difficulty,
  totalQuestions
) => {

  const result = await db.query(
    `
    INSERT INTO interviews
    (
      user_id,
      title,
      role,
      difficulty,
      total_questions
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
      userId,
      title,
      role,
      difficulty,
      totalQuestions
    ]
  );

  return result.rows[0];
};


// ======================================================
// GET ALL INTERVIEWS FOR USER
// ======================================================

export const getAllInterviews = async (
  userId
) => {

  const result = await db.query(
    `
    SELECT *
    FROM interviews
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  );

  return result.rows;
};


// ======================================================
// GET INTERVIEW BY ID
// ======================================================

export const getInterviewById = async (
  id
) => {

  const result = await db.query(
    `
    SELECT *
    FROM interviews
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0];
};


// ======================================================
// DELETE INTERVIEW
// ======================================================

export const deleteInterview = async (
  id
) => {

  const result = await db.query(
    `
    DELETE FROM interviews
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );

  return result.rows[0];
};


// ======================================================
// UPDATE INTERVIEW STATUS
// ======================================================

export const updateStatus = async (
  id,
  status
) => {

  const result = await db.query(
    `
    UPDATE interviews
    SET status = $1
    WHERE id = $2
    RETURNING *
    `,
    [
      status,
      id
    ]
  );

  return result.rows[0];
};