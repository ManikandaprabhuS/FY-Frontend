import axios from "axios";
import { isEmptyResourceResponse, reportMissingResource, resourceResponseKey } from '../utils/resource-not-found';

type ApiFailure = { message?: string; error?: { message?: string; code?: string; details?: { fieldErrors?: Record<string, string[]> } } };
export const getApiErrorMessage = (failure: unknown, fallback = 'Unable to complete the request. Please try again.'): string => {
  if (!axios.isAxiosError<ApiFailure>(failure)) return fallback;
  if (!failure.response) return failure.code === 'ECONNABORTED'
    ? 'The request timed out. Please try again.' : 'Unable to reach the server. Check your connection and try again.';
  const data = failure.response.data;
  if (data?.error?.code === 'VALIDATION_ERROR') {
    const fields = Object.entries(data.error.details?.fieldErrors ?? {}).slice(0, 3);
    if (fields.length) return fields.map(([field, messages]) => `${field}: ${messages.join(', ')}`).join('; ');
  }
  return data?.error?.message || data?.message || fallback;
};

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
    // Bound only admin-form mutations, so failed requests cannot leave forms busy forever.
    if (!config.timeout && !['get', 'head'].includes(config.method?.toLowerCase() ?? 'get') && /^\/(?:products|coupons|employees|product-discounts)(?:\/|$)/.test(config.url ?? '')) config.timeout = 60_000;
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
  (response) => {
    if (response.config.method?.toLowerCase() === 'get' && response.config.url && isEmptyResourceResponse(response.config.url, response.data)) reportMissingResource(response.config.url);
    return response;
  },
  (error: unknown) => {
    if (axios.isAxiosError<ApiFailure>(error)) {
      if (error.response?.status === 404 && error.config?.method?.toLowerCase() === 'get' && error.config.url && resourceResponseKey(error.config.url)) reportMissingResource(error.config.url);
      const message = getApiErrorMessage(error);
      error.message = message;
      if (error.response?.data && typeof error.response.data === 'object') {
        error.response.data.message = message;
        if (error.response.data.error) error.response.data.error.message = message;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
