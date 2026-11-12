import type {
  Difficulty,
  InterviewMode,
  InterviewStatus,
  InterviewType,
  QuestionCategory,
} from '@/types'

export type InterviewDetailsDraft = {
  company_name: string
  role: string
  interview_type: InterviewType
  date: string
  interview_mode: InterviewMode | ''
  status: InterviewStatus
  experience_description: string
}

export type InterviewQuestionDraft = {
  clientId: string
  round_name: string
  question: string
  category: QuestionCategory
  difficulty: Difficulty | ''
  user_answer: string
  evaluation: { score: number | null; feedback: string; model: string } | null
  isEvaluating: boolean
}

export type AnswerEvaluationDraft = {
  score: number | null
  feedback: string
  model: string
}

export function createQuestionDraft(index: number): InterviewQuestionDraft {
  return {
    clientId: crypto.randomUUID(),
    round_name: `Round ${index + 1}`,
    question: '',
    category: 'technical',
    difficulty: '',
    user_answer: '',
    evaluation: null,
    isEvaluating: false,
  }
}
