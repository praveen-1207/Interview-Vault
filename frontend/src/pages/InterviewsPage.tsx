import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { EmptyState, Spinner } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { useInterviews } from '@/features/interviews/hooks'
import type { InterviewStatus } from '@/types'

export function InterviewsPage() {
  const [status, setStatus] = useState<string>('')
  const [q, setQ] = useState('')
  const filters = useMemo(() => ({ status: status || undefined, q: q || undefined }), [status, q])
  const { data, isLoading } = useInterviews(filters)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Interviews</h1>
          <p className="text-sm text-zinc-500">Every interview you've logged, searchable.</p>
        </div>
        <Link to="/interviews/new" className="btn-primary">
          + New Interview
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search company or role…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="input w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="waiting">Waiting</option>
          <option value="selected">Selected</option>
          <option value="rejected">Rejected</option>
          <option value="in_progress">In progress</option>
        </select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="🗂"
          title="No interviews found"
          description={
            q || status
              ? 'Try adjusting your filters.'
              : 'Log your first interview to start building your vault.'
          }
          action={
            !q && !status ? (
              <Link to="/interviews/new" className="btn-primary">
                + New Interview
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Interview type</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.map((interview) => (
                <tr key={interview.id} className="transition hover:bg-zinc-50">
                  <td className="px-5 py-3 font-medium text-zinc-900">{interview.company.name}</td>
                  <td className="px-5 py-3 text-zinc-600">{interview.role}</td>
                  <td className="px-5 py-3 text-zinc-500">{formatDate(interview.date)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={interview.status as InterviewStatus} />
                  </td>
                  <td className="px-5 py-3 capitalize text-zinc-500">{interview.interview_type}</td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      to={`/interviews/${interview.id}`}
                      className="text-sm font-medium text-indigo-600 hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
