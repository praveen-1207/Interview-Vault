import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CategoryBadge, difficultyLabel } from '@/components/ui/Badge'
import { EmptyState, Spinner } from '@/components/ui/Card'
import { useCommunityQuestions, usePublicCompanies } from '@/features/community/hooks'
import type { CommunityQuestionFilters } from '@/features/community/hooks'
import { formatDate } from '@/lib/utils'
import type { Difficulty } from '@/types'

const interviewTypes = [
  ['technical', 'Technical'],
  ['hr', 'HR'],
  ['coding', 'Coding'],
  ['managerial', 'Managerial'],
  ['other', 'Other'],
] as const

const categories = [
  ['technical', 'Technical'],
  ['coding', 'Coding'],
  ['hr', 'HR'],
  ['aptitude', 'Aptitude'],
  ['system_design', 'System design'],
  ['behavioral', 'Behavioral'],
  ['other', 'Other'],
] as const

export function CommunityPage() {
  const [filters, setFilters] = useState<CommunityQuestionFilters>({
    sort: 'newest',
    page: 1,
    page_size: 12,
  })
  const { data, isLoading, isError } = useCommunityQuestions(filters)
  const { data: companies } = usePublicCompanies()
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1

  function setFilter<K extends keyof CommunityQuestionFilters>(
    key: K,
    value: CommunityQuestionFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value || undefined, page: 1 }))
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Community question library</h1>
          <p className="mt-1 max-w-3xl text-sm text-zinc-500">
            Interview questions collected from candidates across the community. Answers, AI
            feedback, notes, and candidate details are never shown here.
          </p>
        </div>
        <Link to="/interviews/new" className="btn-primary">
          + Add interview
        </Link>
      </header>

      <section className="card p-4" aria-label="Filter community questions">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            className="input"
            placeholder="Search questions, companies, roles…"
            aria-label="Search community questions"
            value={filters.q ?? ''}
            onChange={(event) => setFilter('q', event.target.value)}
          />
          <select
            className="input"
            aria-label="Filter by company"
            value={filters.company ?? ''}
            onChange={(event) => setFilter('company', event.target.value)}
          >
            <option value="">All companies</option>
            {(companies ?? []).map((company) => (
              <option key={company.id} value={company.name}>
                {company.name}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Filter by job role"
            aria-label="Filter by job role"
            value={filters.role ?? ''}
            onChange={(event) => setFilter('role', event.target.value)}
          />
          <select
            className="input"
            aria-label="Filter by interview type"
            value={filters.interview_type ?? ''}
            onChange={(event) => setFilter('interview_type', event.target.value)}
          >
            <option value="">All interview types</option>
            {interviewTypes.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Filter by round"
            aria-label="Filter by interview round"
            value={filters.round_name ?? ''}
            onChange={(event) => setFilter('round_name', event.target.value)}
          />
          <select
            className="input"
            aria-label="Filter by topic"
            value={filters.category ?? ''}
            onChange={(event) => setFilter('category', event.target.value)}
          >
            <option value="">All topics</option>
            {categories.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            className="input"
            aria-label="Filter by difficulty"
            value={filters.difficulty ?? ''}
            onChange={(event) => setFilter('difficulty', event.target.value)}
          >
            <option value="">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select
            className="input"
            aria-label="Sort questions"
            value={filters.sort ?? 'newest'}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                sort: event.target.value as CommunityQuestionFilters['sort'],
                page: 1,
              }))
            }
          >
            <option value="newest">Recently added</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </section>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <EmptyState
          title="Could not load community questions"
          description="Check your connection and try again."
        />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon="✦"
          title="No questions found"
          description="Questions from saved interview experiences will appear here. Try a different filter or add an experience."
          action={
            <Link to="/interviews/new" className="btn-primary">
              Add interview experience
            </Link>
          }
        />
      ) : (
        <>
          <p className="text-xs font-medium text-zinc-500">
            {data.total} question{data.total === 1 ? '' : 's'} from interview experiences
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((item) => (
              <article key={item.id} className="card flex flex-col p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-zinc-900">
                    {item.company_name || 'Company Not Specified'}
                  </h2>
                  <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium capitalize text-sky-700 ring-1 ring-inset ring-sky-600/15">
                    {item.interview_type.replace('_', ' ')}
                  </span>
                  {item.difficulty && (
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600">
                      {difficultyLabel[item.difficulty as Difficulty]}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500">{item.role}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span>{item.round_name}</span>
                  <span aria-hidden>·</span>
                  <CategoryBadge category={item.category} />
                  {item.interview_mode && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="capitalize">{item.interview_mode}</span>
                    </>
                  )}
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-800">
                  {item.question}
                </p>
                <p className="mt-auto pt-5 text-xs text-zinc-400">
                  Added {formatDate(item.created_at)}
                </p>
              </article>
            ))}
          </div>
          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-3" aria-label="Question pages">
              <button
                type="button"
                className="btn-secondary !px-3 !py-1.5 text-xs"
                disabled={(filters.page ?? 1) <= 1}
                onClick={() => setFilters((current) => ({ ...current, page: (current.page ?? 1) - 1 }))}
              >
                Previous
              </button>
              <span className="text-sm text-zinc-500">
                Page {data.page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary !px-3 !py-1.5 text-xs"
                disabled={(filters.page ?? 1) >= totalPages}
                onClick={() => setFilters((current) => ({ ...current, page: (current.page ?? 1) + 1 }))}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
