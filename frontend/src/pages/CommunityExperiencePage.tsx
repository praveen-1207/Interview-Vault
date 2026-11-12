import { Link, useParams } from 'react-router-dom'
import { EmptyState, Spinner } from '@/components/ui/Card'
import { modeLabel } from '@/components/ui/Badge'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/components/ui/Toast'
import { PracticeQuestion } from '@/features/community/PracticeQuestion'
import {
  useAIUsage,
  usePublicExperience,
  useSaveExperience,
  useSavedExperiences,
  useUnsaveExperience,
} from '@/features/community/hooks'

export function CommunityExperiencePage() {
  const { id = '' } = useParams()
  const { data, isLoading } = usePublicExperience(id)
  const usage = useAIUsage(id)
  const savedList = useSavedExperiences()
  const save = useSaveExperience(id)
  const unsave = useUnsaveExperience(id)

  if (isLoading) return <Spinner />
  if (!data) {
    return (
      <EmptyState
        title="Experience not found"
        description="It may have been withdrawn or is still awaiting review."
        action={
          <Link to="/community" className="btn-primary">
            Browse community
          </Link>
        }
      />
    )
  }

  const isSaved = Boolean(savedList.data?.some((s) => s.interview.id === id))
  const remaining = usage.data?.remaining ?? 0
  const limit = usage.data?.limit ?? 5
  const used = usage.data?.used ?? 0

  async function toggleSaved() {
    try {
      if (isSaved) {
        await unsave.mutateAsync()
        toast('Removed from saved')
      } else {
        await save.mutateAsync()
        toast('Saved for later')
      }
    } catch (error) {
      toast(getErrorMessage(error), 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/community" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Community
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">
              {data.company.name} · {data.role}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {data.interview_type} interview · {data.question_count} questions in{' '}
              {data.rounds_count} rounds
            </p>
          </div>
          <button className="btn-secondary" onClick={toggleSaved} disabled={save.isPending || unsave.isPending}>
            {isSaved ? '★ Saved' : '☆ Save experience'}
          </button>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          {data.interview_mode && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600">
              {modeLabel[data.interview_mode]}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-indigo-900">Private AI practice</p>
          <p className="text-xs text-indigo-700">
            Answers and feedback are private. {used} of {limit} AI evaluations used for this
            experience.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
          <span>{remaining}</span>
          <span className="text-xs font-normal text-indigo-700">left</span>
        </div>
      </div>

      <div className="space-y-6">
        {data.rounds.length === 0 ? (
          <EmptyState
            title="No rounds shared"
            description="This experience does not include round details."
          />
        ) : (
          data.rounds.map((round) => (
            <section key={round.id} className="card overflow-hidden">
              <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-3">
                <h2 className="text-sm font-semibold text-zinc-900">
                  {round.name}
                  <span className="ml-2 font-normal text-zinc-400">
                    {round.questions.length} question{round.questions.length === 1 ? '' : 's'}
                  </span>
                </h2>
              </div>
              <div className="space-y-3 p-4">
                {round.questions.map((question) => (
                  <PracticeQuestion
                    key={question.id}
                    interviewId={id}
                    question={question}
                    remaining={remaining}
                    limit={limit}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <p className="text-center text-xs text-zinc-400">
        Questions are user-submitted experiences, not scraped content. AI feedback is generated
        only from the question and answer you provide.
      </p>
    </div>
  )
}
