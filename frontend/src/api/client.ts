// =========================================================
// Shared HTTP client used by every API module in this project.
// Handles two jobs automatically:
//   1) Attaching the auth token to every request (request interceptor)
//   2) Refreshing an expired session and retrying (response interceptor)
// =========================================================
import axios from "axios";
import type { AxiosRequestConfig, AxiosHeaders } from "axios";

// Where the backend lives. Overridden per-environment with VITE_API_URL.
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// The one axios instance every api module imports from.
export const api = axios.create({
  baseURL: API_BASE_URL,
});

// --- Request interceptor: "add my token to every request" ---
// Runs before each HTTP call. Reads the saved JWT from localStorage and sets
// the Authorization header to `Bearer <token>`. The backend reads this
// header to know which user is calling.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("iv_access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RetriableRequest extends AxiosRequestConfig {
  _retry?: boolean;
  headers: AxiosHeaders;
}

// Holds an in-flight refresh so concurrent 401s only cause ONE refresh call.
let refreshPromise: Promise<string | null> | null = null;

// --- tryRefresh: exchange the refresh token for a fresh access token ---
// The refresh token lives 7 days. If the access token expired (60 min),
// we use this function to get a brand-new pair without asking the user for
// their password again. Returns the new access token, or null on failure.
async function tryRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem("iv_refresh_token");
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, null, {
      params: { refresh_token: refreshToken },
    });
    localStorage.setItem("iv_access_token", data.access_token);
    localStorage.setItem("iv_refresh_token", data.refresh_token);
    localStorage.setItem("iv_user", JSON.stringify(data.user));
    return data.access_token;
  } catch {
    return null;
  }
}

// --- Response interceptor: keep the session alive ---
// Runs whenever a request finishes (success or error).
// If the error is a 401 (token expired) we:
//   1. skip retrying auth endpoints themselves to avoid a loop,
//   2. refresh the token once,
//   3. replay the original request with the fresh token.
// If refresh also fails, we wipe auth state and redirect to /login.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetriableRequest | undefined;
    if (
      error.response?.status !== 401 ||
      original?._retry ||
      !original?.url ||
      original.url.includes("/api/auth/")
    ) {
      return Promise.reject(error);
    }

    original._retry = true;
    refreshPromise = refreshPromise || tryRefresh();
    const token = await refreshPromise;
    refreshPromise = null;

    if (token) {
      original.headers.set("Authorization", `Bearer ${token}`);
      return api(original);
    }

    localStorage.removeItem("iv_access_token");
    localStorage.removeItem("iv_refresh_token");
    localStorage.removeItem("iv_user");
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
