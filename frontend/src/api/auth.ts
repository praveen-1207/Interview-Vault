import { api } from "./client";
import type { AuthResponse } from "../types";

export const authApi = {
  register: (name: string, email: string, password: string) =>
    api.post<AuthResponse>("/api/auth/register", { name, email, password }).then((r) => r.data),

  login: (email: string, password: string) =>
    api.post<AuthResponse>("/api/auth/login", { email, password }).then((r) => r.data),

  me: () => api.get("/api/auth/me").then((r) => r.data),
};
