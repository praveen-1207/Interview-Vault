// Auth endpoints: create, sign in, and ask "who am I?".
// All three eventually return the same-shaped AuthResponse.
import { api } from "./client";
import type { AuthResponse } from "../types";

export const authApi = {
  // Create a new account. Backend returns tokens + the user immediately,
  // so the signup flow logs the user in right away.
  register: (name: string, email: string, password: string) =>
    api.post<AuthResponse>("/api/auth/register", { name, email, password }).then((r) => r.data),

  // Sign in with email + password.
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/api/auth/login", { email, password }).then((r) => r.data),

  // Fetch the profile of the currently logged-in user.
  me: () => api.get("/api/auth/me").then((r) => r.data),
};
