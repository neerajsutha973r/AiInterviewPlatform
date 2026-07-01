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
    "UPDATE users SET token = $1 WHERE id = $2",
    [token, id]
  );
};
const findByToken = async (token) => {
  const result = await db.query(
    `SELECT * FROM users WHERE token = $1`,
    [token]
  );

  return result.rows[0];
};

export default {
  createUser,
  findByUsername,
  updateToken,
  findByToken,
};
