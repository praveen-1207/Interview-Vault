import { useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Spinner } from '@/components/ui/Card'
import { toast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/lib/api'
import { AddInterviewWorkflow } from '@/features/interviews/AddInterviewWorkflow'
import { useCompanies, useInterview, useUpdateInterview } from '@/features/interviews/hooks'

const schema = z.object({
  company: z.string().min(1, 'Company is required'),
  role: z.string().min(1, 'Role is required'),
  interview_type: z.enum(['technical', 'hr', 'coding', 'managerial', 'other']),
  date: z.string().optional(),
  status: z.enum(['waiting', 'selected', 'rejected', 'in_progress']),
  experience_description: z.string().max(5000).optional(),
  difficulty: z.enum(['', 'easy', 'medium', 'hard']),
  interview_mode: z.enum(['', 'online', 'offline', 'phone', 'video']),
})

type FormValues = z.infer<typeof schema>

function EditInterviewForm({ id }: { id: string }) {
  const navigate = useNavigate()
  const { data: companies = [] } = useCompanies()
  const { data: existing, isLoading } = useInterview(id)
  const update = useUpdateInterview(id)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      interview_type: 'other',
      status: 'waiting',
      difficulty: '',
      interview_mode: '',
    },
  })

  useEffect(() => {
    if (!existing) return
    reset({
      company: existing.company.name,
      role: existing.role,
      interview_type: existing.interview_type,
      date: existing.date?.slice(0, 10) ?? '',
      status: existing.status,
      experience_description: existing.experience_description ?? '',
      difficulty: existing.difficulty ?? '',
      interview_mode: existing.interview_mode ?? '',
    })
  }, [existing, reset])

  async function onSubmit(values: FormValues) {
    const company = companies.find(
      (item) => item.name.toLowerCase() === values.company.trim().toLowerCase(),
    )
    try {
      await update.mutateAsync({
        company_id: company?.id,
        company_name: values.company.trim(),
        role: values.role.trim(),
        interview_type: values.interview_type,
        date: values.date || null,
        status: values.status,
        experience_description: values.experience_description?.trim() || null,
        difficulty: values.difficulty || null,
        interview_mode: values.interview_mode || null,
      })
      toast('Interview updated')
      navigate(`/interviews/${id}`)
    } catch (error) {
      toast(getErrorMessage(error), 'error')
    }
  }

  if (isLoading || !existing) return <Spinner />

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <Link to={`/interviews/${id}`} className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to interview
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">Edit interview details</h1>
      </header>
      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 p-5 sm:p-6" noValidate>
        <div>
          <label htmlFor="edit-company" className="mb-1 block text-sm font-medium text-slate-700">
            Company
          </label>
          <input
            id="edit-company"
            className="input"
            list="edit-company-suggestions"
            {...register('company')}
          />
          <datalist id="edit-company-suggestions">
            {companies.map((company) => <option key={company.id} value={company.name} />)}
          </datalist>
          {errors.company && <p className="mt-1 text-xs text-rose-600">{errors.company.message}</p>}
        </div>

        <div>
          <label htmlFor="edit-role" className="mb-1 block text-sm font-medium text-slate-700">
            Job role / position
          </label>
          <input id="edit-role" className="input" {...register('role')} />
          {errors.role && <p className="mt-1 text-xs text-rose-600">{errors.role.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Interview type" id="edit-interview-type">
            <select id="edit-interview-type" className="input" {...register('interview_type')}>
              <option value="technical">Technical</option>
              <option value="hr">HR</option>
              <option value="coding">Coding</option>
              <option value="managerial">Managerial</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Interview date" id="edit-date">
            <input id="edit-date" type="date" className="input" {...register('date')} />
          </Field>
          <Field label="Interview status" id="edit-status">
            <select id="edit-status" className="input" {...register('status')}>
              <option value="selected">Selected</option>
              <option value="rejected">Rejected</option>
              <option value="waiting">Awaiting result</option>
              <option value="in_progress">In progress</option>
            </select>
          </Field>
          <Field label="Interview mode" id="edit-mode">
            <select id="edit-mode" className="input" {...register('interview_mode')}>
              <option value="">Not specified</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="phone">Phone</option>
              <option value="video">Video call</option>
            </select>
          </Field>
          <Field label="Overall difficulty" id="edit-difficulty">
            <select id="edit-difficulty" className="input" {...register('difficulty')}>
              <option value="">Not specified</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
        </div>

        <div>
          <label htmlFor="edit-notes" className="mb-1 block text-sm font-medium text-slate-700">
            Experience notes <span className="font-normal text-slate-400">(private)</span>
          </label>
          <textarea
            id="edit-notes"
            className="input min-h-24 resize-y"
            {...register('experience_description')}
          />
          {errors.experience_description && (
            <p className="mt-1 text-xs text-rose-600">{errors.experience_description.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Link to={`/interviews/${id}`} className="btn-secondary">Cancel</Link>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  )
}

export function InterviewFormPage() {
  const { id } = useParams()
  return id ? <EditInterviewForm id={id} /> : <AddInterviewWorkflow />
}
