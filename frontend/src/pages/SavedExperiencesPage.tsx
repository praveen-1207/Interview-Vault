import { Link } from 'react-router-dom'
import { EmptyState, Spinner } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/components/ui/Toast'
import { useSavedExperiences, useUnsaveExperience } from '@/features/community/hooks'
import type { SavedExperience } from '@/types'

export function SavedExperiencesPage() {
  const { data, isLoading } = useSavedExperiences()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Saved experiences</h1>
        <p className="text-sm text-zinc-500">
          Experiences you bookmarked to practise before your next interview.
        </p>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="★"
          title="Nothing saved yet"
          description="Browse community experiences and save the ones you want to practise."
          action={
            <Link to="/community" className="btn-primary">
              Browse community
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((saved) => (
            <SavedCard key={saved.id} saved={saved} />
          ))}
        </div>
      )}
    </div>
  )
}

function SavedCard({ saved }: { saved: SavedExperience }) {
  const experience = saved.interview
  const unsave = useUnsaveExperience(experience.id)

  async function handleRemove() {
    try {
      await unsave.mutateAsync()
      toast('Removed from saved')
    } catch (error) {
      toast(getErrorMessage(error), 'error')
    }
  }

  return (
    <div className="card flex flex-col p-5">
      <Link to={`/community/${experience.id}`} className="group">
        <h2 className="text-sm font-semibold text-zinc-900 group-hover:text-indigo-600">
          {experience.company.name}
        </h2>
        <p className="text-sm text-zinc-600">{experience.role}</p>
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        <span>{experience.question_count} questions</span>
        <span>·</span>
        <span>{experience.interview_type}</span>
        <span>·</span>
        <span>{formatDate(experience.created_at)}</span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <Link
          to={`/community/${experience.id}`}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          Practice →
        </Link>
        <button
          className="btn-ghost !px-2 text-xs text-zinc-400 hover:text-rose-600"
          disabled={unsave.isPending}
          onClick={handleRemove}
        >
          Remove
        </button>
      </div>
    </div>
  )
}
