import { useState } from 'react'
import { useCompanies } from '@/features/interviews/hooks'
import { useQuestions } from '@/features/questions/hooks'
import type { QuestionFilters } from '@/features/questions/hooks'
import { EmptyState, Spinner } from '@/components/ui/Card'
import { QuestionCard } from '@/features/questions/QuestionCard'

export function QuestionLibraryPage() {
  const [filters, setFilters] = useState<QuestionFilters>({ sort: 'newest' })
  const { data: companies } = useCompanies()
  const { data, isLoading } = useQuestions(filters)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Question Library</h1>
        <p className="text-sm text-zinc-500">
          Every question you've recorded, with AI feedback. Search and filter across all interviews.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search questions…"
          value={filters.q ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined }))}
        />
        <select
          className="input w-auto"
          aria-label="Filter by company"
          value={filters.company ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value || undefined }))}
        >
          <option value="">All companies</option>
          {(companies ?? []).map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          className="input w-auto min-w-[140px]"
          placeholder="Role"
          value={filters.role ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value || undefined }))}
        />
        <input
          className="input w-auto min-w-[140px]"
          placeholder="Round"
          value={filters.round ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, round: e.target.value || undefined }))}
        />
        <select
          className="input w-auto"
          aria-label="Filter by difficulty"
          value={filters.difficulty ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, difficulty: e.target.value || undefined }))}
        >
          <option value="">All difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select
          className="input w-auto"
          aria-label="Filter by interview status"
          value={filters.status ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
        >
          <option value="">All statuses</option>
          <option value="selected">Selected</option>
          <option value="waiting">Waiting</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          className="input w-auto"
          aria-label="Filter by question category"
          value={filters.category ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value || undefined }))}
        >
          <option value="">All question types</option>
          <option value="technical">Technical</option>
          <option value="coding">Coding</option>
          <option value="hr">HR</option>
          <option value="aptitude">Aptitude</option>
          <option value="system_design">System design</option>
          <option value="behavioral">Behavioral</option>
          <option value="other">Other</option>
        </select>
        <select
          className="input w-auto"
          aria-label="Sort"
          value={filters.sort ?? 'newest'}
          onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as QuestionFilters['sort'] }))}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="✎"
          title="No questions match"
          description="Add questions from your interviews, or adjust your filters."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </div>
      )}
    </div>
  )
}
