import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthProvider, useAuth } from '@/features/auth/AuthContext'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { AdminRoute } from '@/features/auth/AdminRoute'
import { Spinner } from '@/components/ui/Card'

const LandingPage = lazy(() => import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const InterviewsPage = lazy(() => import('@/pages/InterviewsPage').then((m) => ({ default: m.InterviewsPage })))
const InterviewFormPage = lazy(() =>
  import('@/pages/InterviewFormPage').then((m) => ({ default: m.InterviewFormPage })),
)
const InterviewDetailPage = lazy(() =>
  import('@/pages/InterviewDetailPage').then((m) => ({ default: m.InterviewDetailPage })),
)
const QuestionLibraryPage = lazy(() =>
  import('@/pages/QuestionLibraryPage').then((m) => ({ default: m.QuestionLibraryPage })),
)
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const CommunityPage = lazy(() =>
  import('@/pages/CommunityPage').then((m) => ({ default: m.CommunityPage })),
)
const CommunityExperiencePage = lazy(() =>
  import('@/pages/CommunityExperiencePage').then((m) => ({
    default: m.CommunityExperiencePage,
  })),
)
const SavedExperiencesPage = lazy(() =>
  import('@/pages/SavedExperiencesPage').then((m) => ({ default: m.SavedExperiencesPage })),
)
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })))

function PageFallback() {
  return <Spinner label="Loading…" />
}

function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? '/dashboard' : '/'} replace />
}

export function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/community/:id" element={<CommunityExperiencePage />} />
              <Route path="/saved" element={<SavedExperiencesPage />} />
              <Route path="/interviews" element={<InterviewsPage />} />
              <Route path="/interviews/new" element={<InterviewFormPage />} />
              <Route path="/interviews/:id" element={<InterviewDetailPage />} />
              <Route path="/interviews/:id/edit" element={<InterviewFormPage />} />
              <Route path="/questions" element={<QuestionLibraryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}
