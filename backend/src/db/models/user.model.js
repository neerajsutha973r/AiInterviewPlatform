import db from "../connection.js";

const findByUsername = async (username) => {
  const result = await db.query(
    "SELECT * FROM users WHERE username = $1",
    [username]
  );

  return result.rows[0];
};

const createUser = async (name, username, password) => {
  return await db.query(
    "INSERT INTO users(name, username, password) VALUES($1,$2,$3)",
    [name, username, password]
  );
};

const updateToken = async (id, token) => {
  return await db.query(
    "UPDATE users SET token = $1, token_expires_at = statement_timestamp() + INTERVAL '24 hours' WHERE id = $2",
    [token, id]
  );
};
const findByToken = async (token) => {
  const result = await db.query(
    `SELECT * FROM users WHERE token = $1 AND token_expires_at > statement_timestamp()`,
    [token]
  );

  return result.rows[0];
};

const revokeToken = async (id, token) => {
  // Match the presented token as well as the user: a newer login must survive.
  const result = await db.query(
    "UPDATE users SET token = NULL, token_expires_at = NULL WHERE id = $1 AND token = $2 RETURNING id",
    [id, token]
  );
  return result.rows.length > 0;
};

export default {
  createUser,
  findByUsername,
  updateToken,
  findByToken,
  revokeToken,
};
