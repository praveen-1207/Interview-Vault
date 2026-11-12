import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, clearSession, setSession } from '@/lib/api'
import type { AuthPayload } from '@/lib/api'
import type { User } from '@/types'

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .get<User>('/auth/me')
      .then(({ data }) => {
        if (active) setUser(data)
      })
      .catch(() => {
        clearSession()
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function login(email: string, password: string) {
    const { data } = await api.post<AuthPayload>('/auth/login', { email, password })
    setSession(data)
    setUser(data.user)
  }

  async function register(name: string, email: string, password: string) {
    const { data } = await api.post<AuthPayload>('/auth/register', { name, email, password })
    setSession(data)
    setUser(data.user)
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      // local logout even if the server call fails
    }
    clearSession()
    setUser(null)
  }

  async function refreshUser() {
    const { data } = await api.get<User>('/auth/me')
    setUser(data)
  }

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, refreshUser }),
    [user, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

