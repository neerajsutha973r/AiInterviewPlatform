import userModel from "../db/models/user.model.js";

const verifyUser = async (req, res, next) => {

  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({
      message: "No token provided",
    });
  }

  let user;
  try {
    user = await userModel.findByToken(token);
  } catch {
    return res.status(500).json({
      message: "Unable to verify session. Please try again.",
    });
  }

  if (!user) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }

  req.user = user;

  next();
};

export default verifyUser;
