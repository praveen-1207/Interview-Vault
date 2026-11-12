import axios, { AxiosError } from 'axios'
import type { User } from '@/types'

const TOKEN_KEY = 'iv_access'
const REFRESH_KEY = 'iv_refresh'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  withCredentials: false,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

async function attemptRefresh(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_KEY)
  if (!refresh) return null
  try {
    const { data } = await axios.post(
      `${import.meta.env.VITE_API_URL ?? '/api/v1'}/auth/refresh`,
      { refresh_token: refresh },
    )
    localStorage.setItem(TOKEN_KEY, data.access_token)
    localStorage.setItem(REFRESH_KEY, data.refresh_token)
    return data.access_token
  } catch {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true
      refreshPromise = refreshPromise ?? attemptRefresh()
      const token = await refreshPromise
      refreshPromise = null
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
    }
    return Promise.reject(error)
  },
)

export type AuthPayload = { access_token: string; refresh_token: string; user: User }

export function setSession(payload: AuthPayload) {
  localStorage.setItem(TOKEN_KEY, payload.access_token)
  localStorage.setItem(REFRESH_KEY, payload.refresh_token)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (detail?.message) return detail.message
    if (error.response?.status === 401) return 'Session expired. Please sign in again.'
    if (!error.response) return 'Network error. Check your connection.'
  }
  return 'Something went wrong. Please try again.'
}
