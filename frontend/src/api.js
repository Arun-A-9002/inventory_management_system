// api.js

import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
});

// 🔥 Add Authorization header automatically to ALL requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
