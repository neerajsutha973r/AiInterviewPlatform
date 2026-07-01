import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import interviewService from "../services/interviewService";
import "../components/Interview/Interview.css";
import { Navigate } from "react-router-dom";

function Interview() {
  const { id } = useParams();
  const navigate=useNavigate();

  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [il, setIl] = useState(false);


  useEffect(() => {
    fetchInterview();
  }, []);

  const handleStartInterview=async ()=>{
    try{
      setIl(true);
      await interviewService.startInterview(id);
      navigate(`/interview/${id}/questions`);
    }
    catch(err){
      console.log(err);
    }finally{
      setIl(false);
    }
    
  };

  const fetchInterview = async () => {
    try {
      const data = await interviewService.getInterviewById(id);
      setInterview(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading1"><h2>Loading...</h2></div>
      </>
    );
  }

  if (!interview) {
    return (
      <>
        <Navbar />
        <div className="loading1"><h2>Interview Not Found...</h2></div>
      </>
    );
  }
  if(il){
    return (
      <>
        <Navbar />
        <div className="Il"><h2>staring interview...</h2></div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="interview-container">

        <div className="interview-card">

          <h1>{interview.title}</h1>

          <p>
            <strong>Role:</strong> {interview.role}
          </p>

          <p>
            <strong>Difficulty:</strong> {interview.difficulty}
          </p>

          <p>
            <strong>Status:</strong> {interview.status}
          </p>

          <button className="start-btn" onClick={handleStartInterview}>
            Start AI Interview
          </button>

        </div>

      </div>
    </>
  );
}

export default Interview;