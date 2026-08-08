// =========================================================
// AuthContext — the single source of truth for "who is logged in".
// -------------------------------------------------
// Holds the current user in React state and mirrors it to localStorage so a
// page refresh keeps you logged in. Every component can grab this state via
// `useAuth()` instead of passing the user around as props.
// =========================================================
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { User } from "../types";
import { authApi } from "../api/auth";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // On first load, re-hydrate the user from localStorage (if any).
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("iv_user");
    return stored ? JSON.parse(stored) : null;
  });

  // Save tokens + user to localStorage AND update React state.
  // localStorage is what lets the session survive page reloads.
  const persist = (data: { access_token: string; refresh_token: string; user: User }) => {
    localStorage.setItem("iv_access_token", data.access_token);
    localStorage.setItem("iv_refresh_token", data.refresh_token);
    localStorage.setItem("iv_user", JSON.stringify(data.user));
    setUser(data.user);
  };

  // Sign in: call the backend, then persist the returned tokens + user.
  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    persist(data);
  }, []);

  // Sign up: same as login — backend already signs the user in.
  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await authApi.register(name, email, password);
    persist(data);
  }, []);

  // Log out: wipe everything from localStorage and reset state.
  const logout = useCallback(() => {
    localStorage.removeItem("iv_access_token");
    localStorage.removeItem("iv_refresh_token");
    localStorage.removeItem("iv_user");
    setUser(null);
  }, []);

  // Replace the stored user object (e.g. after editing the profile).
  const updateUser = useCallback((u: User) => {
    localStorage.setItem("iv_user", JSON.stringify(u));
    setUser(u);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook any component can call to get the current auth state/functions.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
