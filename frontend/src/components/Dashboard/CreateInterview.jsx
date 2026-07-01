
import { useState } from "react";
import interviewService from "../../services/interviewService";
import "./CreateInterview.css";

function CreateInterview({ onClose, onInterviewCreated }) {
  const [formData, setFormData] = useState({
    title: "",
    role: "",
    difficulty: "Medium",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.role) {
      setError("Please fill all fields.");
      return;
    }

    try {
      setLoading(true);

      await interviewService.createInterview(formData);

      onInterviewCreated(); // Refresh dashboard

      onClose(); // Close modal
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create interview."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">

      <div className="modal">

        <h2>Create Interview</h2>

        <form onSubmit={handleSubmit}>

          <input
            type="text"
            name="title"
            placeholder="Interview Title"
            value={formData.title}
            onChange={handleChange}
          />

          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
          >
            <option value="">Select Role</option>
            <option value="Software Engineer">Software Engineer</option>
            <option value="Frontend Developer">Frontend Developer</option>
            <option value="Backend Developer">Backend Developer</option>
            <option value="Full Stack Developer">Full Stack Developer</option>
            <option value="Data Analyst">Data Analyst</option>
            <option value="AI Engineer">AI Engineer</option>
            <option value="DSA coding">DSA coding</option>
          </select>

          <select
            name="difficulty"
            value={formData.difficulty}
            onChange={handleChange}
          >
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>

          {error && <p className="error">{error}</p>}

          <div className="modal-buttons">

            <button
              type="button"
              className="cancel"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="create"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default CreateInterview;