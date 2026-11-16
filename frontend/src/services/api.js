import axios from "axios";
import { AUTH_STORAGE_ERROR, cleanupLegacyToken, getSessionToken, removeSessionToken } from "./authStorage";

// Discard legacy persistent authentication without reading or migrating it.
cleanupLegacyToken();

const api = axios.create({
  baseURL: "https://aiinterviewplatform-4vfq.onrender.com",
  //
});

const sessionInvalidationListeners = new Set();
export const subscribeToSessionInvalidation = (listener) => {
  sessionInvalidationListeners.add(listener);
  return () => sessionInvalidationListeners.delete(listener);
};

api.interceptors.request.use((config) => {

  // Preserve explicitly bound authentication, including null (no token).
  if (!config.headers.has("authorization")) {
    try {
      const token = getSessionToken();
      if (token) config.headers.authorization = token;
    } catch (error) {
      // Public submissions do not require browser authentication storage.
      const isPublicSubmission = config.method?.toLowerCase() === "post" &&
        ["/api/v1/users/login", "/api/v1/users/register", "/contact"].includes(config.url);
      if (!isPublicSubmission) throw error;
    }
  }

  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    const config = error.config;
    const token = config?.headers?.authorization;
    const isLoginOrSignup = ["/api/v1/users/login", "/api/v1/users/register"].includes(config?.url);
    if (error.response?.status === 401 && !isLoginOrSignup && token) {
      try {
        if (getSessionToken() === token) {
          let storageError = "";
          try { removeSessionToken(); } catch { storageError = AUTH_STORAGE_ERROR; }
          for (const listener of sessionInvalidationListeners) listener(storageError);
        }
      } catch {
        // Without a readable current token, never invalidate a possibly newer session.
      }
    }
    // Propagate the original failure. Never retry interview mutations.
    return Promise.reject(error);
  }
);

export default api;
