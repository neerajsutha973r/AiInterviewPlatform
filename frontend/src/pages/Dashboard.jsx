import {
  useEffect,
  useState
} from "react";

import Navbar
  from "../components/Navbar/Navbar";

import InterviewCard
  from "../components/Dashboard/InterviewCard";

import CreateInterview
  from "../components/Dashboard/CreateInterview";

import interviewService
  from "../services/interviewService";

import "../components/Dashboard/Dashboard.css";

import {
  useNavigate
} from "react-router-dom";

import useAuth
  from "../hooks/useAuth.jsx";


function Dashboard() {

  // ==================================================
  // STATE
  // ==================================================

  const [interviews, setInterviews] =
    useState([]);

  const [showModal, setShowModal] =
    useState(false);

  const [loading, setLoading] =
    useState(true);


  const {
    isAuthenticated
  } = useAuth();


  const navigate =
    useNavigate();


  // ==================================================
  // FETCH INTERVIEWS
  // ==================================================

  useEffect(() => {

    fetchInterviews();

  }, []);


  const fetchInterviews = async () => {

    try {

      setLoading(true);


      const data =
        await interviewService.getAllInterviews();


      setInterviews(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (err) {

      console.error(
        "Fetch interviews error:",
        err
      );

    } finally {

      setLoading(false);

    }

  };


  // ==================================================
  // START INTERVIEW
  // ==================================================

  const handleStart = (
    id
  ) => {

    navigate(
      `/interview/${id}`
    );

  };


  // ==================================================
  // DELETE INTERVIEW
  // ==================================================

  const handleDelete = async (
    id
  ) => {

    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this interview?"
      );


    if (!confirmDelete) {
      return;
    }


    try {

      await interviewService.deleteInterview(
        id
      );


      // Remove deleted interview from state
      setInterviews(
        prev =>
          prev.filter(
            interview =>
              interview.id !== id
          )
      );

    } catch (err) {

      console.error(
        "Delete interview error:",
        err
      );

    }

  };


  // ==================================================
  // AUTHENTICATION
  // ==================================================

  if (!isAuthenticated) {

    return (

      <>

        <Navbar />

        <h2 className="plogin">
          Please login
        </h2>

      </>

    );

  }


  // ==================================================
  // UI
  // ==================================================

  return (

    <>

      <Navbar />


      <div className="dashboard">


        {/* ============================================
            HEADER
        ============================================ */}

        <div className="dashboard-header">

          <h1>
            My Interviews
          </h1>


          <button
            className="create-btn"
            onClick={() =>
              setShowModal(true)
            }
          >
            + Create Interview
          </button>

        </div>


        {/* ============================================
            INTERVIEW LIST
        ============================================ */}

        <div className="interview-grid">


          {/* ==========================================
              FETCHING
          ========================================== */}

          {loading ? (

            <div className="dashboard-loading">

              <h2>
                Fetching interviews...
              </h2>

              <p>
                Please wait a moment.
              </p>

            </div>

          ) : interviews.length === 0 ? (


            /* ========================================
               NO INTERVIEWS
            ======================================== */

            <div className="no-interviews">

              <h2>
                No Interviews Yet
              </h2>

              <p>
                Create your first AI interview
                to get started.
              </p>

            </div>


          ) : (


            /* ========================================
               INTERVIEWS
            ======================================== */

            interviews.map(
              (
                interview
              ) => (

                <InterviewCard

                  key={
                    interview.id
                  }

                  interview={
                    interview
                  }

                  onDelete={
                    handleDelete
                  }

                  onStart={
                    handleStart
                  }

                />

              )
            )

          )}

        </div>


      </div>


      {/* ==============================================
          CREATE INTERVIEW MODAL
      ============================================== */}

      {showModal && (

        <CreateInterview

          onClose={() =>
            setShowModal(false)
          }

          onInterviewCreated={
            async () => {

              await fetchInterviews();

              setShowModal(false);

            }
          }

        />

      )}

    </>

  );

}


export default Dashboard;