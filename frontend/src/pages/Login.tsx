import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { Button, Input, Label } from "../components/ui";

// ---- Login -------------------------------------------------------------
// Sign-in form. Calls the shared `login` from AuthContext which stores the
// tokens, then redirects to the dashboard. Shows a clean error on failure.
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-white">
      <div className="hidden md:flex flex-col justify-center items-center bg-brand-50 p-12">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center mb-6">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h2>
        <p className="text-gray-500 text-center max-w-xs">
          Sign in to continue your interview preparation journey.
        </p>
      </div>

      <div className="flex flex-col justify-center px-8 sm:px-16 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
        <p className="text-gray-500 text-sm mb-8">
          Don't have an account?{" "}
          <Link to="/register" className="text-brand-600 font-medium">Sign up</Link>
        </p>

        <form onSubmit={onSubmit} className="space-y-4 max-w-sm">
          <div>
            <Label>Email</Label>
            <Input type="email" required placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" required placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full justify-center" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
}
