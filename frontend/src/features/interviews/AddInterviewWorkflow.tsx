import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/components/ui/Toast'
import { useAnalyticsSummary } from '@/features/dashboard/hooks'
import { useCompanies } from '@/features/interviews/hooks'
import { getErrorMessage, api } from '@/lib/api'
import type { InterviewDetail } from '@/types'
import { InterviewDetailsModal } from './InterviewDetailsModal'
import { InterviewQuestionsModal } from './InterviewQuestionsModal'
import { createQuestionDraft } from './experienceTypes'
import type {
  AnswerEvaluationDraft,
  InterviewDetailsDraft,
  InterviewQuestionDraft,
} from './experienceTypes'

const initialDetails: InterviewDetailsDraft = {
  company_name: '',
  role: '',
  interview_type: 'technical',
  date: '',
  interview_mode: '',
  status: 'in_progress',
  experience_description: '',
}

export function AddInterviewWorkflow() {
  const navigate = useNavigate()
  const { data: companies = [] } = useCompanies()
  const { data: analytics } = useAnalyticsSummary()
  const [details, setDetails] = useState(initialDetails)
  const [questions, setQuestions] = useState<InterviewQuestionDraft[]>([createQuestionDraft(0)])
  const [activeIndex, setActiveIndex] = useState(0)
  const [step, setStep] = useState<1 | 2>(1)
  const [detailErrors, setDetailErrors] = useState<Partial<Record<'role', string>>>({})
  const [dirty, setDirty] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const submissionKey = useRef(crypto.randomUUID())
  const evaluationLimit = analytics?.evaluation_limit ?? 5
  const evaluationCount = questions.filter((item) => item.evaluation !== null).length

  function updateDetails<K extends keyof InterviewDetailsDraft>(
    key: K,
    value: InterviewDetailsDraft[K],
  ) {
    setDetails((current) => ({ ...current, [key]: value }))
    setDirty(true)
    if (key === 'role') setDetailErrors((current) => ({ ...current, role: undefined }))
  }

  function continueToQuestions() {
    if (!details.role.trim()) {
      setDetailErrors({ role: 'Enter the job role or position.' })
      return
    }
    setDetailErrors({})
    setStep(2)
  }

  function updateQuestion(index: number, patch: Partial<InterviewQuestionDraft>) {
    setQuestions((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        const answerChanged =
          ('question' in patch && patch.question !== item.question) ||
          ('user_answer' in patch && patch.user_answer !== item.user_answer)
        return {
          ...item,
          ...patch,
          evaluation: answerChanged ? null : patch.evaluation ?? item.evaluation,
        }
      }),
    )
    setDirty(true)
    setSaveError(null)
  }

  function addQuestion() {
    const nextIndex = questions.length
    setQuestions((current) => [...current, createQuestionDraft(current.length)])
    setActiveIndex(nextIndex)
    setDirty(true)
    setSaveError(null)
  }

  function deleteQuestion(index: number) {
    const remaining = questions.length === 1
      ? [createQuestionDraft(0)]
      : questions.filter((_, itemIndex) => itemIndex !== index)
    setQuestions(remaining)
    setActiveIndex(Math.min(index, remaining.length - 1))
    setDirty(true)
    setSaveError(null)
  }

  async function evaluateAnswer(index: number) {
    const item = questions[index]
    if (!item?.question.trim() || !item.user_answer.trim()) return
    if (!item.evaluation && evaluationCount >= evaluationLimit) {
      toast(`This interview can include at most ${evaluationLimit} AI evaluations.`, 'error')
      return
    }
    setQuestions((current) =>
      current.map((question, itemIndex) =>
        itemIndex === index ? { ...question, isEvaluating: true } : question,
      ),
    )
    try {
      const { data } = await api.post<AnswerEvaluationDraft>('/interviews/evaluate-answer', {
        question: item.question.trim(),
        answer: item.user_answer.trim(),
      })
      setQuestions((current) =>
        current.map((question, itemIndex) =>
          itemIndex === index
            ? { ...question, evaluation: data, isEvaluating: false }
            : question,
        ),
      )
      setDirty(true)
      toast('AI evaluation ready. It will be saved privately with this experience.')
    } catch (error) {
      setQuestions((current) =>
        current.map((question, itemIndex) =>
          itemIndex === index ? { ...question, isEvaluating: false } : question,
        ),
      )
      toast(getErrorMessage(error), 'error')
    }
  }

  function closeWorkflow() {
    if (isSubmitting) return
    if (dirty && !window.confirm('Discard this unsaved interview experience?')) return
    navigate('/interviews')
  }

  const savingLock = useRef(false)
  async function saveExperience() {
    if (savingLock.current) return
    const emptyIndex = questions.findIndex((item) => !item.question.trim())
    if (emptyIndex !== -1) {
      setActiveIndex(emptyIndex)
      setSaveError(`Enter the question text for Question ${emptyIndex + 1} before saving.`)
      return
    }
    if (questions.some((item) => item.isEvaluating)) return

    savingLock.current = true
    setIsSubmitting(true)
    setSaveError(null)
    try {
      const { data } = await api.post<InterviewDetail>('/interviews/experience', {
        submission_key: submissionKey.current,
        company_name: details.company_name.trim() || null,
        role: details.role.trim(),
        interview_type: details.interview_type,
        date: details.date || null,
        interview_mode: details.interview_mode || null,
        status: details.status,
        experience_description: details.experience_description.trim() || null,
        questions: questions.map((item) => ({
          round_name: item.round_name.trim() || 'Round 1',
          question: item.question.trim(),
          user_answer: item.user_answer.trim(),
          category: item.category,
          difficulty: item.difficulty || null,
          ai_score: item.evaluation?.score ?? null,
          ai_feedback: item.evaluation?.feedback ?? null,
          ai_model: item.evaluation?.model ?? null,
        })),
      })
      setDirty(false)
      toast('Interview experience saved. Its questions are now in the Community Library.')
      navigate(`/interviews/${data.id}`)
    } catch (error) {
      setSaveError(getErrorMessage(error))
    } finally {
      savingLock.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <InterviewDetailsModal
        open={step === 1}
        details={details}
        companies={companies}
        errors={detailErrors}
        onChange={updateDetails}
        onClose={closeWorkflow}
        onNext={continueToQuestions}
      />
      <InterviewQuestionsModal
        open={step === 2}
        details={details}
        questions={questions}
        activeIndex={activeIndex}
        evaluationCount={evaluationCount}
        evaluationLimit={evaluationLimit}
        isSubmitting={isSubmitting}
        saveError={saveError}
        onClose={closeWorkflow}
        onBack={() => setStep(1)}
        onSave={saveExperience}
        onChangeQuestion={updateQuestion}
        onAddQuestion={addQuestion}
        onDeleteQuestion={deleteQuestion}
        onNavigateQuestion={setActiveIndex}
        onEvaluate={evaluateAnswer}
      />
    </>
  )
}
