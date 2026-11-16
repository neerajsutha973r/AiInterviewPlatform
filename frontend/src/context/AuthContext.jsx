import { createContext, useEffect, useRef, useState } from "react";
import authService from "../services/authServcie";
import { subscribeToSessionInvalidation } from "../services/api";
import { AUTH_STORAGE_ERROR, getSessionToken, removeSessionToken } from "../services/authStorage";
import { Navigate,useNavigate } from "react-router-dom";
export const AuthContext = createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [logoutError, setLogoutError] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authRestoreError, setAuthRestoreError] = useState("");
  const logoutPending = useRef(false);
  const authRevision = useRef(0);
  const restoration = useRef(null);
  const navigate=useNavigate();

  const stopRestoration = () => {
    authRevision.current++;
    restoration.current?.cancel();
    restoration.current = null;
  };

  useEffect(()=>{
    const unsubscribe = subscribeToSessionInvalidation((storageError = "") => {
      stopRestoration();
      setUser(null);
      setLogoutError("");
      setAuthRestoreError(storageError);
      setIsAuthLoading(false);
    });
    restoreUser();
    return () => {
      unsubscribe();
      stopRestoration();
    };
  },[]);

  const login = (userData) => {
    stopRestoration();
    setUser(userData);
    setAuthRestoreError("");
    setIsAuthLoading(false);
  };

  const logout = async () => {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setIsLoggingOut(true);
    setLogoutError("");
    const revision = authRevision.current;
    let token;
    let serverConfirmed = false;
    try {
      token = getSessionToken();
      await authService.logout(token);
      serverConfirmed = true;
      if (authRevision.current !== revision || getSessionToken() !== token) return;
      removeSessionToken();
      stopRestoration();
      setUser(null);
      setAuthRestoreError("");
      setIsAuthLoading(false);
      navigate(`/`);
    } catch (error) {
      if (authRevision.current !== revision) return;
      if (error.code === "AUTH_STORAGE_UNAVAILABLE") {
        setLogoutError(serverConfirmed
          ? "The server confirmed logout, but browser session cleanup failed. Allow session storage and retry."
          : `${AUTH_STORAGE_ERROR} Logout could not be confirmed. Please retry.`);
        return;
      }
      try {
        if (getSessionToken() === token) {
          setLogoutError("Logout could not be confirmed by the server. Your local session has been kept. Please retry.");
        }
      } catch {
        setLogoutError(`Logout could not be confirmed by the server. ${AUTH_STORAGE_ERROR}`);
      }
    } finally {
      logoutPending.current = false;
      setIsLoggingOut(false);
    }
  };
  
  const restoreUser=async()=>{
    let token;
    try {
      token = getSessionToken();
    } catch {
      setAuthRestoreError(AUTH_STORAGE_ERROR);
      setIsAuthLoading(false);
      return;
    }
    if (!token) {
      setIsAuthLoading(false);
      return;
    }
    const revision = authRevision.current;
    const controller = new AbortController();
    let rejectControl;
    const control = new Promise((_resolve, reject) => { rejectControl = reject; });
    const timeout = setTimeout(() => {
      const error = new Error("Session restoration timed out");
      error.code = "RESTORE_TIMEOUT";
      rejectControl(error);
      controller.abort();
    }, 10000);
    const attempt = {
      cancel: () => {
        clearTimeout(timeout);
        rejectControl(new Error("Session restoration superseded"));
        controller.abort();
      },
    };
    restoration.current = attempt;
    const isCurrent = () => authRevision.current === revision;
    try{
      const restoredUser = await Promise.race([
        authService.getCurrentUser(token, controller.signal), control,
      ]);
      if (isCurrent() && getSessionToken() === token) {
        setUser(restoredUser);
        setAuthRestoreError("");
      }
    }
    catch(err){
      if (!isCurrent()) return;
      try {
        if (getSessionToken() !== token) return;
      } catch {
        setAuthRestoreError(AUTH_STORAGE_ERROR);
        return;
      }
      if (err.response?.status === 401) {
        // The API interceptor handles matching-token invalidation.
        setUser(null);
        setAuthRestoreError("");
      } else {
        const timedOut = ["RESTORE_TIMEOUT", "ECONNABORTED", "ETIMEDOUT"].includes(err.code);
        setAuthRestoreError(timedOut
          ? "Session check timed out. Refresh to try again."
          : "Unable to verify your session. Refresh to try again.");
      }
    }
    finally{
      clearTimeout(timeout);
      if (restoration.current === attempt) restoration.current = null;
      if (isCurrent()) setIsAuthLoading(false);
    }
  }
  
  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        logoutError,
        isLoggingOut,
        isAuthLoading,
        authRestoreError,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
