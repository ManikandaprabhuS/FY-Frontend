import axios from "axios";

const configuredApiUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1").replace(/\/+$/, "");
const apiBaseUrl = configuredApiUrl.endsWith("/api/v1")
  ? configuredApiUrl
  : `${configuredApiUrl}/api/v1`;

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token =
      sessionStorage.getItem("fy_auth_token") ||
      localStorage.getItem("fy_auth_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const backendMessage = error?.response?.data?.error?.message;
    if (backendMessage && error.response?.data) {
      error.response.data.message = backendMessage;
    }
    return Promise.reject(error);
  }
);

export default api;
