import { Modal } from '@/components/ui/Modal'
import type { Company } from '@/types'
import type { InterviewDetailsDraft } from './experienceTypes'

type Props = {
  open: boolean
  details: InterviewDetailsDraft
  companies: Company[]
  errors: Partial<Record<'role', string>>
  onChange: <K extends keyof InterviewDetailsDraft>(
    key: K,
    value: InterviewDetailsDraft[K],
  ) => void
  onClose: () => void
  onNext: () => void
}

export function InterviewDetailsModal({
  open,
  details,
  companies,
  errors,
  onChange,
  onClose,
  onNext,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Add Interview Experience" className="max-w-2xl">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Add the interview context first. Your saved questions will be available in the Community
          Question Library automatically.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="experience-company" className="mb-1 block text-sm font-medium text-slate-700">
              Company name
            </label>
            <input
              id="experience-company"
              className="input"
              value={details.company_name}
              onChange={(event) => onChange('company_name', event.target.value)}
              placeholder="Leave blank if unknown"
              list="experience-company-suggestions"
              autoComplete="organization"
            />
            <datalist id="experience-company-suggestions">
              {companies.map((company) => <option key={company.id} value={company.name} />)}
            </datalist>
            <p className="mt-1 text-xs text-slate-400">
              Empty company names appear as “Company Not Specified”.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="experience-role" className="mb-1 block text-sm font-medium text-slate-700">
              Job role / position <span className="text-rose-500">*</span>
            </label>
            <input
              id="experience-role"
              className="input"
              value={details.role}
              onChange={(event) => onChange('role', event.target.value)}
              placeholder="e.g. Software Engineer"
              autoComplete="organization-title"
              aria-invalid={Boolean(errors.role)}
              aria-describedby={errors.role ? 'experience-role-error' : undefined}
            />
            {errors.role && (
              <p id="experience-role-error" className="mt-1 text-xs text-rose-600">
                {errors.role}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="experience-type" className="mb-1 block text-sm font-medium text-slate-700">
              Interview type
            </label>
            <select
              id="experience-type"
              className="input"
              value={details.interview_type}
              onChange={(event) =>
                onChange('interview_type', event.target.value as InterviewDetailsDraft['interview_type'])
              }
            >
              <option value="technical">Technical</option>
              <option value="hr">HR</option>
              <option value="coding">Coding</option>
              <option value="managerial">Managerial</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="experience-date" className="mb-1 block text-sm font-medium text-slate-700">
              Interview date
            </label>
            <input
              id="experience-date"
              type="date"
              className="input"
              value={details.date}
              onChange={(event) => onChange('date', event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="experience-mode" className="mb-1 block text-sm font-medium text-slate-700">
              Interview mode
            </label>
            <select
              id="experience-mode"
              className="input"
              value={details.interview_mode}
              onChange={(event) =>
                onChange('interview_mode', event.target.value as InterviewDetailsDraft['interview_mode'])
              }
            >
              <option value="">Not specified</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="phone">Phone</option>
            </select>
          </div>

          <div>
            <label htmlFor="experience-status" className="mb-1 block text-sm font-medium text-slate-700">
              Interview status
            </label>
            <select
              id="experience-status"
              className="input"
              value={details.status}
              onChange={(event) =>
                onChange('status', event.target.value as InterviewDetailsDraft['status'])
              }
            >
              <option value="selected">Selected</option>
              <option value="rejected">Rejected</option>
              <option value="waiting">Awaiting result</option>
              <option value="in_progress">In progress</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="experience-notes" className="mb-1 block text-sm font-medium text-slate-700">
              Experience notes <span className="font-normal text-slate-400">(private)</span>
            </label>
            <textarea
              id="experience-notes"
              className="input min-h-24 resize-y"
              maxLength={5000}
              value={details.experience_description}
              onChange={(event) => onChange('experience_description', event.target.value)}
              placeholder="Optional notes for your own reference. These are never shown in Community."
            />
          </div>
        </div>

        <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-4 sm:flex-row">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" onClick={onNext}>
            Next: Add Questions
          </button>
        </div>
      </div>
    </Modal>
  )
}
