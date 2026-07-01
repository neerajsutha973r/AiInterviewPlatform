import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "../src/pages/Home.jsx";
import Login from "../src/pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Interview from "./pages/Interview.jsx";
import InterviewQuestions from "./pages/InterviewQuestions.jsx";
import InterviewResult from "./pages/InterviewResult.jsx";
import TestVoice from "./pages/TestVoice.jsx";
import Aboutai from "./pages/Aboutai.jsx";
import Contactai from "./pages/Contactai.jsx";

function App() {
  return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login/>}/>
        <Route path="/signup" element={<Signup />}/>
        <Route path="/dashboard" element={<Dashboard/>} />
        <Route path="/interview/:id" element={<Interview />} />
        <Route path="/interview/:id/questions" element={<InterviewQuestions/>}/>
        <Route path="/interview/:id/result" element={<InterviewResult/>}/>
        <Route path="/voice" element={<TestVoice/>}/>
        <Route path="/About" element={<Aboutai/>}/>
        <Route path="/contact" element={<Contactai/>}/>
        
      </Routes>
  );
}

export default App;