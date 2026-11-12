import { CategoryBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import type { InterviewDetailsDraft, InterviewQuestionDraft } from './experienceTypes'

type Props = {
  open: boolean
  details: InterviewDetailsDraft
  questions: InterviewQuestionDraft[]
  activeIndex: number
  evaluationCount: number
  evaluationLimit: number
  isSubmitting: boolean
  saveError: string | null
  onClose: () => void
  onBack: () => void
  onSave: () => void
  onChangeQuestion: (index: number, patch: Partial<InterviewQuestionDraft>) => void
  onAddQuestion: () => void
  onDeleteQuestion: (index: number) => void
  onNavigateQuestion: (index: number) => void
  onEvaluate: (index: number) => void
}

export function InterviewQuestionsModal({
  open,
  details,
  questions,
  activeIndex,
  evaluationCount,
  evaluationLimit,
  isSubmitting,
  saveError,
  onClose,
  onBack,
  onSave,
  onChangeQuestion,
  onAddQuestion,
  onDeleteQuestion,
  onNavigateQuestion,
  onEvaluate,
}: Props) {
  const current = questions[activeIndex]
  const isEvaluating = questions.some((question) => question.isEvaluating)
  if (!current) return null

  return (
    <Modal open={open} onClose={onClose} title="Add Interview Questions" className="max-w-3xl">
      <div className="space-y-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3">
          <div className="grid gap-1 text-sm sm:grid-cols-3 sm:gap-4">
            <p><span className="font-medium text-slate-600">Company:</span> {details.company_name.trim() || 'Company Not Specified'}</p>
            <p><span className="font-medium text-slate-600">Role:</span> {details.role.trim()}</p>
            <p><span className="font-medium text-slate-600">Interview Type:</span> {details.interview_type}</p>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800">
              Question {activeIndex + 1} of {questions.length}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary !px-3 !py-1.5 text-xs"
                onClick={() => onNavigateQuestion(activeIndex - 1)}
                disabled={activeIndex === 0 || isEvaluating || isSubmitting}
              >
                Previous Question
              </button>
              <button
                type="button"
                className="btn-secondary !px-3 !py-1.5 text-xs"
                onClick={() => onNavigateQuestion(activeIndex + 1)}
                disabled={activeIndex === questions.length - 1 || isEvaluating || isSubmitting}
              >
                Next Question
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="question-round" className="mb-1 block text-sm font-medium text-slate-700">
              Interview round
            </label>
            <input
              id="question-round"
              className="input"
              value={current.round_name}
              disabled={current.isEvaluating}
              onChange={(event) => onChangeQuestion(activeIndex, { round_name: event.target.value })}
              placeholder="e.g. Round 1"
            />
          </div>
          <div>
            <label htmlFor="question-category" className="mb-1 block text-sm font-medium text-slate-700">
              Topic / category
            </label>
            <select
              id="question-category"
              className="input"
              value={current.category}
              disabled={current.isEvaluating}
              onChange={(event) =>
                onChangeQuestion(activeIndex, {
                  category: event.target.value as InterviewQuestionDraft['category'],
                })
              }
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
            <label htmlFor="question-difficulty" className="mb-1 block text-sm font-medium text-slate-700">
              Difficulty
            </label>
            <select
              id="question-difficulty"
              className="input"
              value={current.difficulty}
              disabled={current.isEvaluating}
              onChange={(event) =>
                onChangeQuestion(activeIndex, {
                  difficulty: event.target.value as InterviewQuestionDraft['difficulty'],
                })
              }
            >
              <option value="">Not specified</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="flex items-end">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-500">
              <span>Question topic</span>
              <CategoryBadge category={current.category} />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="question-text" className="mb-1 block text-sm font-medium text-slate-700">
            Question text <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="question-text"
            className="input min-h-24 resize-y"
            maxLength={20000}
            value={current.question}
            disabled={current.isEvaluating}
            onChange={(event) => onChangeQuestion(activeIndex, { question: event.target.value })}
            placeholder="Write the interview question as you remember it."
          />
        </div>

        <div>
          <label htmlFor="question-answer" className="mb-1 block text-sm font-medium text-slate-700">
            My answer <span className="font-normal text-slate-400">(private)</span>
          </label>
          <textarea
            id="question-answer"
            className="input min-h-28 resize-y"
            maxLength={20000}
            value={current.user_answer}
            disabled={current.isEvaluating}
            onChange={(event) => onChangeQuestion(activeIndex, { user_answer: event.target.value })}
            placeholder="Your answer is private and is never included in the community question library."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => onEvaluate(activeIndex)}
            disabled={
              !current.question.trim() ||
              !current.user_answer.trim() ||
              current.isEvaluating ||
              isSubmitting ||
              Boolean(current.evaluation) ||
              evaluationCount >= evaluationLimit
            }
          >
            {current.isEvaluating
              ? 'Checking answer...'
              : current.evaluation
                ? 'Answer Checked'
                : 'Check Answer with AI'}
          </button>
          <p className="self-center text-xs text-slate-500" aria-live="polite">
            AI evaluations: {evaluationCount} / {evaluationLimit}
          </p>
          <button type="button" className="btn-secondary" onClick={onAddQuestion} disabled={isEvaluating || isSubmitting}>
            + Add Another Question
          </button>
          {questions.length > 1 && (
            <button
              type="button"
              className="btn-ghost text-rose-600 hover:text-rose-700"
              onClick={() => onDeleteQuestion(activeIndex)}
              disabled={isEvaluating || isSubmitting}
            >
              Delete Question
            </button>
          )}
        </div>

        {current.evaluation && (
          <section className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-indigo-950">AI evaluation</h3>
              {current.evaluation.score !== null && (
                <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-indigo-700">
                  {current.evaluation.score}/100
                </span>
              )}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {current.evaluation.feedback}
            </p>
            <p className="mt-2 text-xs text-slate-400">This feedback is private.</p>
          </section>
        )}

        {saveError && (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {saveError}
          </p>
        )}

        <div className="flex flex-col-reverse justify-between gap-2 border-t border-slate-100 pt-4 sm:flex-row">
          <button type="button" className="btn-secondary" onClick={onBack} disabled={isSubmitting}>
            Back to Interview Details
          </button>
          <button type="button" className="btn-primary" onClick={onSave} disabled={isSubmitting || isEvaluating}>
            {isSubmitting ? 'Saving experience…' : 'Save Interview Experience'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
