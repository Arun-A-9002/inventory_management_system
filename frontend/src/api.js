// api.js

import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000", // Change this if backend runs on different port
  timeout: 10000, // 10 second timeout
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

// 🔥 Handle 401 responses (token expired)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_data");
      
      // Redirect to login page
      window.location.href = "/login";
      
      return Promise.reject(new Error("Session expired. Please login again."));
    }
    return Promise.reject(error);
  }
);

export default api;
