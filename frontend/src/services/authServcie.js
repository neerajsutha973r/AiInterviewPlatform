import api from "./api";

const authService = {
  // Signup
  signup: async (userData) => {
    const response = await api.post("/api/v1/users/register", userData);
    return response.data;
  },

  // Login
  login: async (credentials) => {
    const response = await api.post("/api/v1/users/login", credentials);
    return response.data;
  },

  // Logout
  logout: async (token) => {
    const response = await api.post("/api/v1/users/logout", undefined, {
      timeout: 10000,
      // Null explicitly disables auth when logout began without a token.
      headers: { authorization: token ?? null },
    });
    return response.data;
  },

  // Get Logged In User
  getCurrentUser: async (token, signal) => {
    const response = await api.get("/api/v1/users/me", {
      timeout: 10000,
      signal,
      headers: { authorization: token ?? null },
    });
    return response.data;
  },
};

export default authService;
