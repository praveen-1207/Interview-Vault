import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, Spinner } from '@/components/ui/Card'
import { PublicationBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/components/ui/Toast'
import {
  useAdminExperiences,
  useApproveExperience,
  useRejectExperience,
} from '@/features/admin/hooks'
import type { AdminExperience, PublicationStatus } from '@/types'

const statusOptions: Array<{ value: PublicationStatus | ''; label: string }> = [
  { value: 'pending_review', label: 'Pending review' },
  { value: '', label: 'All experiences' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Changes requested' },
  { value: 'draft', label: 'Drafts' },
]

export function AdminPage() {
  const [status, setStatus] = useState<PublicationStatus | ''>('pending_review')
  const { data, isLoading } = useAdminExperiences({ status })
  const approve = useApproveExperience()
  const reject = useRejectExperience()
  const [rejectTarget, setRejectTarget] = useState<AdminExperience | null>(null)
  const [reason, setReason] = useState('')

  async function handleApprove(experience: AdminExperience) {
    try {
      await approve.mutateAsync(experience.id)
      toast('Experience approved and published')
    } catch (error) {
      toast(getErrorMessage(error), 'error')
    }
  }

  async function handleReject() {
    if (!rejectTarget || !reason.trim()) return
    try {
      await reject.mutateAsync({ interviewId: rejectTarget.id, reason: reason.trim() })
      toast('Changes requested')
      setRejectTarget(null)
      setReason('')
    } catch (error) {
      toast(getErrorMessage(error), 'error')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Admin review</h1>
          <p className="text-sm text-zinc-500">
            Approve or request changes before an experience appears in the community feed.
          </p>
        </div>
        <select
          className="input w-auto"
          aria-label="Filter by publication status"
          value={status}
          onChange={(e) => setStatus(e.target.value as PublicationStatus | '')}
        >
          {statusOptions.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon="🛡"
          title="Nothing to review"
          description="Submitted experiences will appear here for approval."
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-zinc-400">{data.total} experience(s)</p>
          {data.items.map((experience) => (
            <div key={experience.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-zinc-900">
                      {experience.company.name} · {experience.role}
                    </h2>
                    <PublicationBadge status={experience.publication_status} />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {experience.owner_name} ({experience.owner_email}) ·{' '}
                    {experience.question_count} questions · submitted{' '}
                    {formatDate(experience.updated_at ?? experience.created_at)}
                  </p>
                  {experience.experience_description && (
                    <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm text-zinc-600">
                      {experience.experience_description}
                    </p>
                  )}
                  {experience.rejection_reason && (
                    <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      Previous feedback: {experience.rejection_reason}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link to={`/interviews/${experience.id}`} className="btn-secondary !px-3 !py-1.5 text-xs">
                    Open
                  </Link>
                  {experience.publication_status !== 'approved' && (
                    <button
                      className="btn-primary !px-3 !py-1.5 text-xs"
                      disabled={approve.isPending}
                      onClick={() => handleApprove(experience)}
                    >
                      Approve
                    </button>
                  )}
                  {experience.publication_status !== 'rejected' && (
                    <button
                      className="btn-ghost !px-3 !py-1.5 text-xs text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        setRejectTarget(experience)
                        setReason('')
                      }}
                    >
                      Request changes
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title="Request changes"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Explain what needs to change before this experience can be published. The owner will
            see this feedback.
          </p>
          <textarea
            className="input min-h-28 resize-y"
            placeholder="e.g. Remove personal contact details and add the missing rounds."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setRejectTarget(null)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={!reason.trim() || reject.isPending}
              onClick={handleReject}
            >
              {reject.isPending ? 'Sending…' : 'Send feedback'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
