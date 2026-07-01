import db from "../connection.js";

export const createInterview = async (
  userId,
  title,
  role,
  difficulty
) => {
  const result = await db.query(
    `INSERT INTO interviews
    (user_id, title, role, difficulty)
    VALUES ($1, $2, $3, $4)
    RETURNING *`,
    [userId, title, role, difficulty]
  );

  return result.rows[0];
};

export const getAllInterviews = async (userId) => {
  const result = await db.query(
    `SELECT *
     FROM interviews
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
};

export const getInterviewById = async (id) => {
  const result = await db.query(
    `SELECT *
     FROM interviews
     WHERE id = $1`,
    [id]
  );

  return result.rows[0];
};

export const deleteInterview = async (id) => {
  const result = await db.query(
    `DELETE FROM interviews
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  return result.rows[0];
};

export const updateStatus = async (id, status) => {

    const result=await db.query(
        `
        UPDATE interviews
        SET status = $1
        WHERE id = $2
        `,
        [status, id]
    );
  return result.rows[0];
};
