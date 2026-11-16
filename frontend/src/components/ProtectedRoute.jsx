import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth.jsx";

function ProtectedRoute() {
  const { isAuthenticated, isAuthLoading, authRestoreError } = useAuth();

  if (isAuthLoading) {
    return <p role="status">Checking session...</p>;
  }

  if (!isAuthenticated) {
    if (authRestoreError) return <p role="alert">{authRestoreError}</p>;
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
