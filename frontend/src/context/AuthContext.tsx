// =========================================================
// AuthContext — the single source of truth for "who is logged in".
// -------------------------------------------------
// Holds the current user in React state and mirrors it to localStorage so a
// page refresh keeps you logged in. Every component can grab this state via
// `useAuth()` instead of passing the user around as props.
// -------------------------------------------------
// IMPORTANT — stale-session protection: on app boot we call `/api/auth/me`
// to VALIDATE any saved token. If it is old, expired, or references a user
// that no longer exists in the database (e.g. after a DB migration), the
// session is discarded automatically. This guarantees the UI can never get
// stuck "logged in" with a token every request rejects (which used to
// surface as confusing 401/CORS errors on every page load).
// =========================================================
import { useState, useCallback, useEffect, type ReactNode } from "react";
import type { User } from "../types";
import { authApi } from "../api/auth";
import { AuthContext } from "./useAuth";

export function AuthProvider({ children }: { children: ReactNode }) {
  // On first load, re-hydrate the user from localStorage (if any).
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("iv_user");
    return stored ? JSON.parse(stored) : null;
  });

  // True while we check the saved token against the backend on first load.
  const [isBootstrapping, setIsBootstrapping] = useState(true);

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

  // Validate any saved session once on boot. If the stored token refers to
  // a user that no longer exists (DB reset/migration), this clears the
  // session so the app boots logged-out instead of stuck with 401s.
  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        const token = localStorage.getItem("iv_access_token");
        if (token) {
          const me = await authApi.me();
          if (!cancelled) {
            // Store the freshest copy of the user, and make sure the id
            // matches what the backend knows.
            localStorage.setItem("iv_user", JSON.stringify(me));
            setUser(me);
          }
        }
      } catch {
        // 401 / network error — token is invalid or the user is gone.
        if (!cancelled) logout();
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    };
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isBootstrapping, login, register, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
