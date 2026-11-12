import { Navigate, Outlet } from 'react-router-dom'
import { Spinner } from '@/components/ui/Card'
import { useAuth } from '@/features/auth/AuthContext'

export function AdminRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <Spinner label="Checking permissions…" />
  if (!user?.is_admin) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
