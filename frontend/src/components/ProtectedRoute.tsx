// ProtectedRoute — wraps pages that require a logged-in user.
// If not authenticated, redirect to /login. Otherwise render the page.
// While the app is still verifying the saved session on first load
// (`isBootstrapping`), show nothing rather than flashing the login page.
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/useAuth";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isBootstrapping } = useAuth();
  if (isBootstrapping) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
