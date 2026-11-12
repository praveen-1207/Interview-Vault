import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { api, getErrorMessage } from '@/lib/api'
import { toast } from '@/components/ui/Toast'

const profileSchema = z.object({
  name: z.string().min(2, 'Name is required'),
})
const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(6, 'New password must be at least 6 characters'),
})

type ProfileValues = z.infer<typeof profileSchema>

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
    },
  })
  const passwordForm = useForm<{ current_password: string; new_password: string }>({
    resolver: zodResolver(passwordSchema),
  })

  async function updateProfile(values: ProfileValues) {
    setSavingProfile(true)
    try {
      await api.patch('/auth/me', {
        name: values.name,
      })
      await refreshUser()
      toast('Profile updated')
    } catch (error) {
      toast(getErrorMessage(error), 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  async function updatePassword(values: { current_password: string; new_password: string }) {
    setSavingPassword(true)
    try {
      await api.post('/auth/change-password', values)
      passwordForm.reset()
      toast('Password changed')
    } catch (error) {
      toast(getErrorMessage(error), 'error')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Profile</h1>
        <p className="text-sm text-zinc-500">Manage your account profile and password.</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">Email</h2>
            <p className="text-sm text-zinc-500">{user?.email}</p>
          </div>
          {user?.is_admin && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
              Admin
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          Your email and display name are not included in the community question library.
        </p>
      </div>

      <form onSubmit={profileForm.handleSubmit(updateProfile)} className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Display name</h2>
        <div>
          <input className="input" placeholder="Your name" {...profileForm.register('name')} />
          {profileForm.formState.errors.name && (
            <p className="mt-1 text-xs text-rose-600">
              {profileForm.formState.errors.name.message}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={savingProfile}>
            {savingProfile ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>

      <form onSubmit={passwordForm.handleSubmit(updatePassword)} className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Change password</h2>
        <div>
          <label htmlFor="current-password" className="mb-1 block text-sm font-medium text-zinc-700">
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            className="input"
            {...passwordForm.register('current_password')}
          />
        </div>
        <div>
          <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-zinc-700">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            className="input"
            {...passwordForm.register('new_password')}
          />
          {passwordForm.formState.errors.new_password && (
            <p className="mt-1 text-xs text-rose-600">
              {passwordForm.formState.errors.new_password.message}
            </p>
          )}
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={savingPassword}>
            {savingPassword ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </div>
  )
}
