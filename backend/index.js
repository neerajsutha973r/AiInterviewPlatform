import express from "express";
import cors from "cors";
import userRoutes from "../backend/src/routes/user.routes.js";
import interviewRoutes from "../backend/src/routes/interview.routes.js";
import dotenv from "dotenv";
dotenv.config();
import answerRoutes from "./src/routes/answer.routes.js"
import contactRoutes from "./src/routes/contact.routes.js"


const app=express();
app.use(
  cors({
    origin: "http://localhost:5173",
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

app.listen(8000,()=>{
    console.log("listening on 8000");
})