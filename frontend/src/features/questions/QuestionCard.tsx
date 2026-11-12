import { useState } from 'react'
import type { Question } from '@/types'
import { formatDate } from '@/lib/utils'
import { AIFeedbackPanel } from '@/features/interviews/AIFeedbackPanel'
import { CategoryBadge } from '@/components/ui/Badge'
import { useReanalyze } from '@/features/questions/hooks'
import { getErrorMessage } from '@/lib/api'
import { toast } from '@/components/ui/Toast'

export function QuestionCard({ question }: { question: Question }) {
  const [open, setOpen] = useState(false)
  const reanalyze = useReanalyze()

  return (
    <div className="card flex flex-col p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-zinc-900">{question.question}</p>
        <CategoryBadge category={question.category} />
      </div>
      <div className="mt-2 space-y-1 text-xs text-zinc-500">
        <p>
          {question.company_name || 'Company not specified'} · {question.role || 'Role not specified'}
        </p>
        <p>
          {question.round_name ? `Round: ${question.round_name}` : 'Round not specified'}
          {question.difficulty ? ` · Difficulty: ${question.difficulty}` : ''}
        </p>
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        {question.user_answer
          ? `Your answer: ${question.user_answer.slice(0, 80)}${question.user_answer.length > 80 ? '…' : ''}`
          : 'No answer recorded'}
        {' · '}
        {formatDate(question.created_at)}
      </p>

      <div className="mt-3 flex items-center gap-2">
        {question.ai_answer ? (
          <>
            <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => setOpen((v) => !v)}>
              {open ? 'Hide AI feedback' : 'View AI feedback'}
            </button>
            <button
              className="btn-ghost !px-3 !py-1.5 text-xs"
              disabled={reanalyze.isPending}
              onClick={async () => {
                try {
                  await reanalyze.mutateAsync(question.id)
                  toast('Re-analyzed')
                } catch (error) {
                  toast(getErrorMessage(error), 'error')
                }
              }}
            >
              {reanalyze.isPending ? 'Analyzing…' : 'Re-analyze'}
            </button>
          </>
        ) : (
          <span className="inline-flex items-center gap-2 text-xs text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Not analyzed yet
          </span>
        )}
      </div>

      {open && question.ai_answer && (
        <div className="mt-4">
          <AIFeedbackPanel markdown={question.ai_answer} />
        </div>
      )}
    </div>
  )
}
