import { useState } from 'react'
import type { Question } from '@/types'
import { cn, formatDate } from '@/lib/utils'
import { AIFeedbackPanel } from './AIFeedbackPanel'
import { CategoryBadge } from '@/components/ui/Badge'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/components/ui/Toast'

type Props = {
  question: Question
  onAnalyze: (id: string) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
  analyzing: boolean
}

export function QuestionItem({ question, onAnalyze, onDelete, analyzing }: Props) {
  const [showAnswer, setShowAnswer] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-zinc-900">{question.question}</p>
            <CategoryBadge category={question.category} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!question.ai_answer && (
            <button
              className="btn-primary !px-3 !py-1.5 text-xs"
              disabled={analyzing}
              onClick={async () => {
                try {
                  await onAnalyze(question.id)
                  setShowFeedback(true)
                  toast('AI analysis complete')
                } catch (error) {
                  toast(getErrorMessage(error), 'error')
                }
              }}
            >
              {analyzing ? 'Analyzing…' : '✨ Analyze'}
            </button>
          )}
          <button
            className="btn-ghost !px-2 text-zinc-400 hover:text-rose-600"
            aria-label="Delete question"
            onClick={async () => {
              if (confirm('Delete this question?')) {
                try {
                  await onDelete(question.id)
                  toast('Question deleted')
                } catch (error) {
                  toast(getErrorMessage(error), 'error')
                }
              }
            }}
          >
            🗑
          </button>
        </div>
      </div>

      <p className="mt-1 text-xs text-zinc-400">{formatDate(question.created_at)}</p>

      <button
        className="mt-3 text-sm font-medium text-indigo-600 hover:underline"
        onClick={() => setShowAnswer((v) => !v)}
      >
        {showAnswer ? 'Hide your answer' : 'Your answer'}
      </button>
      {showAnswer && (
        <p className={cn('mt-2 whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-sm text-zinc-700')}>
          {question.user_answer || 'No answer recorded.'}
        </p>
      )}

      {question.ai_answer && (
        <div className="mt-3">
          <button
            className="text-sm font-medium text-indigo-600 hover:underline"
            onClick={() => setShowFeedback((v) => !v)}
          >
            {showFeedback ? 'Hide AI feedback' : 'View AI feedback'}
          </button>
          {showFeedback && (
            <div className="mt-3">
              <AIFeedbackPanel markdown={question.ai_answer} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
