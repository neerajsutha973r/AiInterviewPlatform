import express from "express";
import {
  login,
  register,
  getCurrentUser,
  logout,
} from "../controllers/user.controller.js";
import verifyUser from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/login", login);

router.post("/register", register);
 
router.get("/me", getCurrentUser);
router.post("/logout", verifyUser, logout);


export default router;
