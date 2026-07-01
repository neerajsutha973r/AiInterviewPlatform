import axios from "axios";

const api = axios.create({
  baseURL: "https://aiinterviewplatform-4vfq.onrender.com",
});

api.interceptors.request.use((config) => {

  const token = localStorage.getItem("token");

  if (token) {
    config.headers.authorization = token;
  }

  return config;
});

export default api;