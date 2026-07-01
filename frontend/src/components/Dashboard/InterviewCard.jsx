import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

function InterviewCard({ interview, onDelete }) {

  const navigate = useNavigate();

  const handleAction = () => {

    if (interview.status === "Pending") {
      navigate(`/interview/${interview.id}`);
    }

    else if (interview.status === "In Progress") {
      navigate(`/interview/${interview.id}/questions`);
    }

    else if (interview.status === "Completed") {
      navigate(`/interview/${interview.id}/result`);
    }

  };

  return (

    <div className="card">

      <h2>{interview.title}</h2>

      <p>
        <strong>Role:</strong> {interview.role}
      </p>

      <p>
        <strong>Difficulty:</strong> {interview.difficulty}
      </p>

      <p>
        <strong>Status:</strong> {interview.status}
      </p>

      <div className="card-buttons">

        <button
          className={
            interview.status === "Completed"
              ? "result"
              : "start"
          }
          onClick={handleAction}
        >

          {interview.status === "Pending" &&
            "Start Interview"}

          {interview.status === "In Progress" &&
            "Continue Interview"}

          {interview.status === "Completed" &&
            "View Result"}

        </button>

        <button
          className="delete"
          onClick={() => onDelete(interview.id)}
        >
          Delete
        </button>

      </div>

    </div>

  );
}

export default InterviewCard;