// App.tsx — root component. Sets up the auth provider and all routes.
// Public routes (Landing/Login/Register) are open; the rest are wrapped in
// <ProtectedRoute> so only logged-in users can see them.
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Interviews from "./pages/Interviews";
import AddInterview from "./pages/AddInterview";
import InterviewDetail from "./pages/InterviewDetail";
import QuestionLibrary from "./pages/QuestionLibrary";
import AIAnalysis from "./pages/AIAnalysis";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/interviews" element={<ProtectedRoute><Interviews /></ProtectedRoute>} />
          <Route path="/interviews/new" element={<ProtectedRoute><AddInterview /></ProtectedRoute>} />
          <Route path="/interviews/:id" element={<ProtectedRoute><InterviewDetail /></ProtectedRoute>} />
          <Route path="/questions" element={<ProtectedRoute><QuestionLibrary /></ProtectedRoute>} />
          <Route path="/analysis" element={<ProtectedRoute><AIAnalysis /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
