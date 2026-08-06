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
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("iv_user");
    return stored ? JSON.parse(stored) : null;
  });

  const persist = (data: { access_token: string; refresh_token: string; user: User }) => {
    localStorage.setItem("iv_access_token", data.access_token);
    localStorage.setItem("iv_refresh_token", data.refresh_token);
    localStorage.setItem("iv_user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    persist(data);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await authApi.register(name, email, password);
    persist(data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("iv_access_token");
    localStorage.removeItem("iv_refresh_token");
    localStorage.removeItem("iv_user");
    setUser(null);
  }, []);

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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
