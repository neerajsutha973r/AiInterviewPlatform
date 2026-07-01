import express from "express";
import {
  login,
  register,
  getCurrentUser,
} from "../controllers/user.controller.js";

const router = express.Router();

router.post("/login", login);

router.post("/register", register);
 
router.get("/me", getCurrentUser);


export default router;