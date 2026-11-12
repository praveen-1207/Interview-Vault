import { NavLink } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/utils'

const baseNav = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/community', label: 'Community', icon: '🌐' },
  { to: '/saved', label: 'Saved', icon: '★' },
  { to: '/interviews', label: 'My Interviews', icon: '☰' },
  { to: '/questions', label: 'Question Library', icon: '✎' },
  { to: '/profile', label: 'Profile', icon: '◉' },
]

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth()
  const nav = user?.is_admin
    ? [...baseNav, { to: '/admin', label: 'Admin review', icon: '🛡' }]
    : baseNav

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-zinc-900/40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          'app-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
            IV
          </span>
          <span className="sidebar-brand text-base font-semibold">InterviewVault</span>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white',
                )
              }
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-divider border-t p-4">
          <div className="flex items-center gap-3">
            <div className="sidebar-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="sidebar-user-name truncate text-sm font-medium">
                {user?.name}
                {user?.is_admin && (
                  <span className="ml-2 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Admin
                  </span>
                )}
              </p>
              <p className="sidebar-user-email truncate text-xs">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="btn-ghost mt-3 w-full justify-center">
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
