import { Link, useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { EmptyState, Spinner } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { QuestionItem } from '@/features/interviews/QuestionItem'
import { toast } from '@/components/ui/Toast'
import { getErrorMessage } from '@/lib/api'
import {
  useAnalyzeQuestion,
  useCreateQuestion,
  useCreateRound,
  useDeleteInterview,
  useDeleteQuestion,
  useDeleteRound,
  useInterview,
  useUpdateInterview,
} from '@/features/interviews/hooks'
import type { InterviewStatus, QuestionCategory } from '@/types'

export function InterviewDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useInterview(id)
  const createRound = useCreateRound(id)
  const createQuestion = useCreateQuestion()
  const analyze = useAnalyzeQuestion()
  const deleteQuestion = useDeleteQuestion()
  const deleteRound = useDeleteRound()
  const deleteInterview = useDeleteInterview(id)
  const updateInterview = useUpdateInterview(id)

  const [roundModal, setRoundModal] = useState(false)
  const [questionModal, setQuestionModal] = useState<{ roundId: string } | null>(null)
  const [roundName, setRoundName] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [answerText, setAnswerText] = useState('')
  const [category, setCategory] = useState<QuestionCategory>('technical')
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (isLoading) return <Spinner />
  if (!data) return <EmptyState title="Interview not found" description="It may have been deleted." />

  async function handleAnalyze(questionId: string) {
    setAnalyzingId(questionId)
    try {
      await analyze.mutateAsync(questionId)
    } finally {
      setAnalyzingId(null)
    }
  }

  async function handleCreateRound() {
    if (!roundName.trim()) return
    setBusy(true)
    try {
      await createRound.mutateAsync(roundName.trim())
      setRoundName('')
      setRoundModal(false)
      toast('Round added')
    } catch (error) {
      toast(getErrorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateQuestion() {
    if (!questionModal || !questionText.trim()) return
    setBusy(true)
    try {
      await createQuestion.mutateAsync({
        roundId: questionModal.roundId,
        question: questionText.trim(),
        user_answer: answerText.trim(),
        category,
      })
      setQuestionText('')
      setAnswerText('')
      setCategory('technical')
      setQuestionModal(null)
      toast('Question added')
    } catch (error) {
      toast(getErrorMessage(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/interviews" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← All interviews
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-zinc-900">
              {data.company.name} · {data.role}
            </h1>
            <StatusBadge status={data.status} />
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {data.interview_type} interview · {formatDate(data.date)} · {data.rounds.length} round(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input w-auto"
            value={data.status}
            onChange={(e) =>
              updateInterview.mutate(
                { status: e.target.value as InterviewStatus },
                { onSuccess: () => toast('Status updated') },
              )
            }
            aria-label="Update status"
          >
            <option value="waiting">Waiting</option>
            <option value="selected">Selected</option>
            <option value="rejected">Rejected</option>
            <option value="in_progress">In progress</option>
          </select>
          <Link to={`/interviews/${id}/edit`} className="btn-secondary">
            Edit
          </Link>
          <button
            className="btn-ghost text-rose-600 hover:bg-rose-50"
            onClick={async () => {
              if (!confirm('Delete this interview and all its rounds/questions?')) return
              try {
                await deleteInterview.mutateAsync()
                toast('Interview deleted')
                navigate('/interviews')
              } catch (error) {
                toast(getErrorMessage(error), 'error')
              }
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
        <p className="text-sm font-medium text-blue-950">
          Questions are shared with the Community Library
        </p>
        <p className="mt-1 text-xs text-blue-800">
          Only company and interview context, round names, and questions are shown. Your answers,
          AI feedback, notes, and identity remain private.
        </p>
      </div>

      <div className="space-y-6">
        {data.rounds.length === 0 ? (
          <EmptyState
            icon="🔄"
            title="No rounds yet"
            description="Add a round like Technical, HR, or Manager to start capturing questions."
            action={
              <button className="btn-primary" onClick={() => setRoundModal(true)}>
                + Add first round
              </button>
            }
          />
        ) : (
          data.rounds.map((round) => (
            <section key={round.id} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-5 py-3">
                <h2 className="text-sm font-semibold text-zinc-900">
                  {round.name}
                  <span className="ml-2 font-normal text-zinc-400">
                    {round.questions.length} question{round.questions.length === 1 ? '' : 's'}
                  </span>
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-primary !px-3 !py-1.5 text-xs"
                    onClick={() => setQuestionModal({ roundId: round.id })}
                  >
                    + Question
                  </button>
                  <button
                    className="btn-ghost !px-2 text-zinc-400 hover:text-rose-600"
                    aria-label="Delete round"
                    onClick={async () => {
                      if (!confirm(`Delete round "${round.name}"?`)) return
                      try {
                        await deleteRound.mutateAsync(round.id)
                        toast('Round deleted')
                      } catch (error) {
                        toast(getErrorMessage(error), 'error')
                      }
                    }}
                  >
                    🗑
                  </button>
                </div>
              </div>
              <div className="space-y-3 p-4">
                {round.questions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-zinc-400">
                    No questions yet. Add the questions you were asked.
                  </p>
                ) : (
                  round.questions.map((q) => (
                    <QuestionItem
                      key={q.id}
                      question={q}
                      analyzing={analyzingId === q.id}
                      onAnalyze={handleAnalyze}
                      onDelete={(qid) => deleteQuestion.mutateAsync(qid)}
                    />
                  ))
                )}
              </div>
            </section>
          ))
        )}
      </div>

      {data.rounds.length > 0 && (
        <button className="btn-secondary" onClick={() => setRoundModal(true)}>
          + Add another round
        </button>
      )}

      <Modal open={roundModal} onClose={() => setRoundModal(false)} title="Add a round">
        <div className="space-y-4">
          <div>
            <label htmlFor="round-name" className="mb-1 block text-sm font-medium text-zinc-700">
              Round name
            </label>
            <input
              id="round-name"
              className="input"
              placeholder="e.g. Technical Round"
              value={roundName}
              onChange={(e) => setRoundName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRound()}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setRoundModal(false)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={busy || !roundName.trim()} onClick={handleCreateRound}>
              Add round
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(questionModal)}
        onClose={() => setQuestionModal(null)}
        title="Add a question"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="question-text" className="mb-1 block text-sm font-medium text-zinc-700">
              Question asked
            </label>
            <textarea
              id="question-text"
              className="input min-h-20 resize-y"
              placeholder="e.g. Explain closures in JavaScript"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="question-category" className="mb-1 block text-sm font-medium text-zinc-700">
              Question type
            </label>
            <select
              id="question-category"
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value as QuestionCategory)}
            >
              <option value="technical">Technical</option>
              <option value="coding">Coding</option>
              <option value="hr">HR</option>
              <option value="aptitude">Aptitude</option>
              <option value="system_design">System design</option>
              <option value="behavioral">Behavioral</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="answer-text" className="mb-1 block text-sm font-medium text-zinc-700">
              Your answer (optional)
            </label>
            <textarea
              id="answer-text"
              className="input min-h-24 resize-y"
              placeholder="What did you say?"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setQuestionModal(null)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={busy || !questionText.trim()}
              onClick={handleCreateQuestion}
            >
              Add question
            </button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
