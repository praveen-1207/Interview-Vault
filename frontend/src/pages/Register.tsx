import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "../context/useAuth";
import { Button, Input, Label } from "../components/ui";

// ---- Register ----------------------------------------------------------
// Sign-up form. Calls AuthContext.register (backed signs the user in too)
// then redirects to the dashboard.
export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(name, email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Registration failed.");
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Start your journey</h2>
        <p className="text-gray-500 text-center max-w-xs">
          Track your interviews, get AI feedback, and prepare smarter.
        </p>
      </div>

      <div className="flex flex-col justify-center px-8 sm:px-16 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
        <p className="text-gray-500 text-sm mb-8">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-600 font-medium">Sign in</Link>
        </p>

        <form onSubmit={onSubmit} className="space-y-4 max-w-sm">
          <div>
            <Label>Full Name</Label>
            <Input required placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" required placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" required minLength={6} placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full justify-center" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>
      </div>
    </div>
  );
}
