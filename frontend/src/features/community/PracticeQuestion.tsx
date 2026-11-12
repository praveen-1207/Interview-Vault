import { useEffect, useState } from 'react'
import type { PublicQuestion } from '@/types'
import { CategoryBadge } from '@/components/ui/Badge'
import { AIFeedbackPanel } from '@/features/interviews/AIFeedbackPanel'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/components/ui/Toast'
import {
  useAnswer,
  useEvaluateAnswer,
  useEvaluation,
  useSaveAnswer,
} from '@/features/community/hooks'

type Props = {
  interviewId: string
  question: PublicQuestion
  remaining: number
  limit: number
}

export function PracticeQuestion({ interviewId, question, remaining, limit }: Props) {
  const [answer, setAnswer] = useState('')
  const existingAnswer = useAnswer(interviewId, question.id)
  const evaluationQuery = useEvaluation(interviewId, question.id)
  const saveAnswer = useSaveAnswer(interviewId, question.id)
  const evaluate = useEvaluateAnswer(interviewId, question.id)
  const evaluation = evaluate.data?.evaluation ?? evaluationQuery.data
  const quotaLeft = evaluate.data?.remaining ?? remaining

  useEffect(() => {
    if (existingAnswer.data) setAnswer(existingAnswer.data.answer_text)
  }, [existingAnswer.data])

  async function handleSave() {
    if (!answer.trim()) return
    try {
      await saveAnswer.mutateAsync(answer.trim())
      toast('Answer saved privately')
    } catch (error) {
      toast(getErrorMessage(error), 'error')
    }
  }

  async function handleEvaluate() {
    if (!answer.trim()) return
    try {
      await evaluate.mutateAsync(answer.trim())
      toast('AI feedback ready')
    } catch (error) {
      toast(getErrorMessage(error), 'error')
    }
  }

  const quotaExhausted = quotaLeft <= 0 && !evaluation

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-zinc-900">{question.question}</p>
        <CategoryBadge category={question.category} />
      </div>

      <textarea
        className="input mt-3 min-h-24 resize-y"
        placeholder="Type your answer here. Only you can see it."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          className="btn-secondary !px-3 !py-1.5 text-xs"
          disabled={!answer.trim() || saveAnswer.isPending}
          onClick={handleSave}
        >
          {saveAnswer.isPending ? 'Saving…' : 'Save answer'}
        </button>
        <button
          className="btn-primary !px-3 !py-1.5 text-xs"
          disabled={!answer.trim() || evaluate.isPending || quotaExhausted}
          onClick={handleEvaluate}
        >
          {evaluate.isPending ? 'Evaluating…' : evaluation ? 'Re-evaluate' : '✨ Evaluate with AI'}
        </button>
        <span className="text-xs text-zinc-400">
          {quotaExhausted
            ? 'AI limit reached for this experience.'
            : `${quotaLeft} of ${limit} AI evaluations left`}
        </span>
      </div>

      {evaluation && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-700">AI score</span>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-sm font-semibold text-indigo-700">
              {evaluation.score ?? '—'}
              {evaluation.score != null ? '/100' : ''}
            </span>
          </div>
          <AIFeedbackPanel markdown={evaluation.feedback} />
        </div>
      )}
    </div>
  )
}
