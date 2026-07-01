import userModel from "../db/models/user.model.js";

const verifyUser = async (req, res, next) => {

  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({
      message: "No token provided",
    });
  }

  const user = await userModel.findByToken(token);

  if (!user) {
    return res.status(401).json({
      message: "Invalid token",
    });
  }

  req.user = user;

  next();
};

export default verifyUser;