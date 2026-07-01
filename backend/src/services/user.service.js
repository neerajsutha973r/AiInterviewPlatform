import bcrypt from "bcrypt";
import crypto from "crypto";
import userModel from "../db/models/user.model.js";

const register = async (name, username, password) => {

  const existingUser = await userModel.findByUsername(username);

  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await userModel.createUser(
    name,
    username,
    hashedPassword
  );
};

const login = async (username, password) => {

  const user = await userModel.findByUsername(username);

  if (!user) {
    throw new Error("User not found");
  }

  const isPasswordCorrect = await bcrypt.compare(
    password,
    user.password
  );

  if (!isPasswordCorrect) {
    throw new Error("Invalid password");
  }

  const token = crypto.randomBytes(20).toString("hex");

  await userModel.updateToken(user.id, token);

  return {
    token,
    user:{
      id:user.id,
      name:user.name,
      username:user.username,

    },
  };
};

const getCurrentUser = async (token) => {

  const user = await userModel.findByToken(token);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export default {
  register,
  login,
  getCurrentUser,
};