import "./Navbar.css";
import useAuth from "../../hooks/useAuth.jsx";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Navigate } from "react-router-dom";

function Navbar() {
  const { isAuthenticated, logout, logoutError, isLoggingOut } = useAuth();
  const location = useLocation();
  const navigate=useNavigate();

  return (
    <nav className="navbar">
      <h2 className="logo">AiInterview</h2>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
      </div>

      <div className="buttons">
        {isAuthenticated ? (
          <div>
            <button className="logout" onClick={logout} disabled={isLoggingOut}>
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
            {logoutError && <p role="alert">{logoutError}</p>}
          </div>
        ) : (
          <>
            {location.pathname !== "/login" && (
              <Link to="/login">
                <button className="login">Login</button>
              </Link>
            )}

            {location.pathname !== "/signup" && (
              <Link to="/signup">
                <button className="signup">Sign Up</button>
              </Link>
            )}
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
