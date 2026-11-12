// =========================================================
// useAuth — the React hook that exposes the auth context.
// -------------------------------------------------
// Deliberately lives OUTSIDE AuthContext.tsx. AuthContext.tsx exports the
// <AuthProvider> component; a file that mixes component + hook exports breaks
// Vite's Fast Refresh (every hot edit remounts the whole tree and throws
// "useAuth must be used within AuthProvider"). Isolating the hook here keeps
// edits to the provider hot-reloadable without crashing the app.
// =========================================================
import { createContext, useContext } from "react";
import type { User } from "../types";

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook any component can call to get the current auth state/functions.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}