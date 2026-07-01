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
  logout: async () => {
    const response = await api.post("/api/v1/users/logout");
    return response.data;
  },

  // Get Logged In User
  getCurrentUser: async () => {
    const response = await api.get("/api/v1/users/me");
    return response.data;
  },
};

export default authService;