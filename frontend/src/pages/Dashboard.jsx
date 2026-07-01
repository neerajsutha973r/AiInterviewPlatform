import { useEffect, useState } from "react";
import Navbar from "../components/Navbar/Navbar";
import InterviewCard from "../components/Dashboard/InterviewCard";
import CreateInterview from "../components/Dashboard/CreateInterview";
import interviewService from "../services/interviewService";
import "../components/Dashboard/Dashboard.css";
import { useNavigate } from "react-router-dom"
import useAuth from "../hooks/useAuth.jsx";

function Dashboard() {
  const [interviews, setInterviews] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const{isAuthenticated,logout}=useAuth();

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const data = await interviewService.getAllInterviews();
      setInterviews(data);
    } catch (err) {
      console.log(err);
    }
  };
  
   const navigate = useNavigate();

   const handleStart = (id) => {
   navigate(`/interview/${id}`);
}; 

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this interview?"
    );

    if (!confirmDelete) return;

    try {
      await interviewService.deleteInterview(id);

      // Remove deleted interview from state
      setInterviews((prev) =>
        prev.filter((interview) => interview.id !== id)
      );
    } catch (err) {
      console.log(err);
    }
  };
  if(!isAuthenticated){
    return (
      <>
      <Navbar/>
      <h2 className="plogin">Please login</h2>
      </>
    );
  }
  return (
    <>
      <Navbar />
      

      <div className="dashboard">

        <div className="dashboard-header">
          <h1>My Interviews</h1>

          <button
            className="create-btn"
            onClick={() => setShowModal(true)}
          >
            + Create Interview
          </button>
        </div>

        <div className="interview-grid">

          {interviews.length === 0 ? (
            <h2>No Interviews Yet</h2>
          ) : (
            interviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                onDelete={handleDelete}
                onStart={handleStart}
              />
            ))
          )}

        </div>
      </div>

      {showModal && (
        <CreateInterview
          onClose={() => setShowModal(false)}
          onInterviewCreated={fetchInterviews}
        />
      )}
    </>
  );
}

export default Dashboard;