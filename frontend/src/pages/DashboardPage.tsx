import { Link } from 'react-router-dom'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { EmptyState, Skeleton, Spinner, StatCard } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import {
  useAnalyticsSummary,
  useCompanyDistribution,
  useMonthlyActivity,
} from '@/features/dashboard/hooks'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export function DashboardPage() {
  const summary = useAnalyticsSummary()
  const monthly = useMonthlyActivity()
  const companies = useCompanyDistribution()

  if (summary.isLoading || monthly.isLoading || companies.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Spinner />
      </div>
    )
  }

  if (summary.data?.total === 0) {
    return (
      <EmptyState
        icon="🗂"
        title="No interviews yet"
        description="Log your first interview to start building your learning vault."
        action={
          <Link to="/interviews/new" className="btn-primary">
            Log your first interview
          </Link>
        }
      />
    )
  }

  const s = summary.data!
  const monthlyData = monthly.data ?? []
  const companyData = companies.data ?? []

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Interviews" value={s.total} />
        <StatCard label="Selected" value={s.selected} tone="success" />
        <StatCard label="Awaiting / in progress" value={s.waiting} tone="warning" />
        <StatCard label="Rejected" value={s.rejected} tone="danger" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Published experiences" value={s.approved} tone="success" />
        <StatCard label="Pending review" value={s.pending} tone="warning" />
        <StatCard label="AI evaluations used" value={`${s.evaluations_used} / ${s.evaluation_limit}`} />
        <StatCard label="Saved experiences" value={s.saved_count} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Monthly interview activity</h2>
          <Bar
            data={{
              labels: monthlyData.map((m) => m.month),
              datasets: [
                {
                  label: 'Interviews',
                  data: monthlyData.map((m) => m.total),
                  backgroundColor: '#4f46e5',
                  borderRadius: 4,
                },
              ],
            }}
            options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
          />
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Company distribution</h2>
          {companyData.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">No company data yet</p>
          ) : (
            <Doughnut
              data={{
                labels: companyData.map((c) => c.company),
                datasets: [
                  {
                    data: companyData.map((c) => c.count),
                    backgroundColor: ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
                  },
                ],
              }}
              options={{ plugins: { legend: { position: 'bottom' } } }}
            />
          )}
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Recent activity</h2>
          <Link to="/interviews" className="text-sm font-medium text-indigo-600 hover:underline">
            View all
          </Link>
        </div>
        <ul className="divide-y divide-zinc-100">
          {(s.recent ?? []).map((interview) => (
            <li key={interview.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {interview.company.name}
                  <span className="font-normal text-zinc-500"> · {interview.role}</span>
                </p>
                <p className="text-xs text-zinc-400">
                  {formatDate(interview.date)} · {interview.interview_type.replace('_', ' ')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={interview.status} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
