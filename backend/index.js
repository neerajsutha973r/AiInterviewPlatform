import express from "express";
import cors from "cors";
import userRoutes from "../backend/src/routes/user.routes.js";
import interviewRoutes from "../backend/src/routes/interview.routes.js";
import dotenv from "dotenv";
dotenv.config();
import answerRoutes from "./src/routes/answer.routes.js"
import contactRoutes from "./src/routes/contact.routes.js"
import startServer from "./src/startup.js";


const app=express();
app.use(
  cors({
    origin: "https://ai-interview-platform-mocha-six.vercel.app",
    //
    credentials: true,
  })
);
app.use(express.json({limit:"40kb"}));
app.use(express.urlencoded({limit:"40kb",extended:true}));

//Routes
app.use("/api/v1/users",userRoutes);
app.use("/interview",interviewRoutes);
app.use("/answer", answerRoutes);
app.use("/contact",contactRoutes);

const PORT = process.env.PORT || 8000;
startServer(app, PORT).catch((error) => {
    const message = error.code === "SCHEMA_NOT_READY"
      ? "Required schema is missing or incompatible: users.token_expires_at must be TIMESTAMPTZ. Apply migration 001 before starting."
      : "Database readiness or server startup failed. Verify PostgreSQL availability and migration 001.";
    console.error("Backend startup aborted:", message);
    process.exit(1);
});
