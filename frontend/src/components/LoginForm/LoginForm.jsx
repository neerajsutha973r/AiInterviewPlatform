import { useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../../services/authServcie.js";
import useAuth from "../../hooks/useAuth.jsx";
import "./LoginForm.css";


function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: "",
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

    if (!formData.username || !formData.password) {
      setError("Please fill all fields.");
      return;
    }

    try {
      setLoading(true);

      const data = await authService.login(formData);
      localStorage.setItem("token",data.token);
      console.log(data.user);
      // Save user in AuthContext
      login(data.user);

      // Redirect to home
      navigate("/dashboard");
    } catch (err) {
        console.log(err);
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-page">
      <div className="login-card">

        <h1>Welcome Back</h1>

        <p>Login to continue your AI Interview journey.</p>

        <form onSubmit={handleSubmit}>

          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

      </div>
    </section>
  );
}

export default LoginForm;