import httpStatus from "http-status";
import userService from "../services/user.service.js";

const register = async (req, res) => {

  const { name, username, password } = req.body;

  if (!name || !username || !password) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: "Please provide all fields",
    });
  }

  try {

    await userService.register(
      name,
      username,
      password
    );

    return res.status(httpStatus.CREATED).json({
      message: "User Registered",
    });

  } catch (err) {

    if (err.message === "User already exists") {
      return res.status(httpStatus.CONFLICT).json({
        message: err.message,
      });
    }

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Unable to register. Please try again.",
    });

  }
};

const login = async (req, res) => {

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: "Please provide username and password",
    });
  }

  try {

    const data = await userService.login(
      username,
      password
    );

    return res.status(httpStatus.OK).json(
     data
    );

  } catch (err) {

    if (err.message === "User not found") {
      return res.status(httpStatus.NOT_FOUND).json({
        message: err.message,
      });
    }

    if (err.message === "Invalid password") {
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: err.message,
      });
    }

    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Unable to log in. Please try again.",
    });

  }
};
const getCurrentUser = async (req, res) => {
  try {

    const token = req.headers.authorization;

    const user = await userService.getCurrentUser(token);

    return res.status(httpStatus.OK).json(user);

  } catch (err) {

    if (err.code === "INVALID_SESSION") {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "User not found" });
    }
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Unable to verify session. Please try again.",
    });

  }
};

const logout = async (req, res) => {
  try {
    const revoked = await userService.logout(req.user.id, req.headers.authorization);
    if (!revoked) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid token" });
    }
    return res.status(httpStatus.OK).json({ message: "Logged out successfully" });
  } catch {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Logout failed. Server revocation could not be confirmed.",
    });
  }
};

export {
  register,
  login,
  getCurrentUser,
  logout,
};
