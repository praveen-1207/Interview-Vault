export type User = {
  id: string
  name: string
  email: string
  is_admin: boolean
  public_username: string | null
  created_at: string
}

export type InterviewStatus = 'waiting' | 'selected' | 'rejected' | 'in_progress'

export type PublicationStatus = 'draft' | 'pending_review' | 'approved' | 'rejected'

export type Difficulty = 'easy' | 'medium' | 'hard'

export type InterviewMode = 'online' | 'offline' | 'phone' | 'video'

export type InterviewType = 'technical' | 'hr' | 'coding' | 'managerial' | 'other'

export type PublicIdentity = 'anonymous' | 'username'

export type QuestionCategory =
  | 'technical'
  | 'coding'
  | 'hr'
  | 'aptitude'
  | 'system_design'
  | 'behavioral'
  | 'other'

export type Company = {
  id: string
  name: string
}

export type Interview = {
  id: string
  user_id: string
  company: Company
  role: string
  interview_type: InterviewType
  date: string | null
  status: InterviewStatus
  experience_description: string | null
  difficulty: Difficulty | null
  interview_mode: InterviewMode | null
  publication_status: PublicationStatus
  publish_consent: boolean
  public_identity: PublicIdentity
  rejection_reason: string | null
  reviewed_at: string | null
  published_at: string | null
  updated_at: string | null
  created_at: string
}

export type InterviewDetail = Interview & {
  rounds: Round[]
}

export type Round = {
  id: string
  interview_id: string
  name: string
  created_at: string
  questions: Question[]
}

export type Question = {
  id: string
  round_id: string
  question: string
  user_answer: string
  ai_answer: string | null
  category: QuestionCategory
  order_index: number | null
  company_name?: string | null
  role?: string | null
  interview_type?: InterviewType | null
  round_name?: string | null
  difficulty?: Difficulty | null
  interview_mode?: InterviewMode | null
  publication_status?: PublicationStatus | null
  created_at: string
}

export type PublicQuestion = {
  id: string
  question: string
  category: QuestionCategory
  difficulty: Difficulty | null
  order_index: number | null
}

export type PublicRound = {
  id: string
  name: string
  questions: PublicQuestion[]
}

export type CommunityQuestion = {
  id: string
  company_name: string
  role: string
  interview_type: InterviewType
  interview_mode: InterviewMode | null
  round_name: string
  question: string
  category: QuestionCategory
  difficulty: Difficulty | null
  created_at: string
}

export type CommunityQuestionListResponse = {
  items: CommunityQuestion[]
  total: number
  page: number
  page_size: number
}

export type PublicExperience = {
  id: string
  company: Company
  role: string
  interview_type: InterviewType
  interview_mode: InterviewMode | null
  question_count: number
  rounds_count: number
  published_at: string | null
  created_at: string
}

export type PublicExperienceDetail = PublicExperience & {
  rounds: PublicRound[]
}

export type CommunityListResponse = {
  items: PublicExperience[]
  total: number
  page: number
  page_size: number
}

export type SavedExperience = {
  id: string
  interview: PublicExperience
  created_at: string
}

export type Answer = {
  id: string
  question_id: string
  answer_text: string
  created_at: string
  updated_at: string
}

export type AIEvaluation = {
  id: string
  interview_id: string
  question_id: string
  answer_id: string | null
  score: number | null
  feedback: string
  model: string | null
  created_at: string
}

export type EvaluateResult = {
  evaluation: AIEvaluation
  used: number
  limit: number
  remaining: number
}

export type AIUsage = {
  used: number
  limit: number
  remaining: number
}

export type AdminExperience = Interview & {
  owner_name: string
  owner_email: string
  question_count: number
}

export type AdminListResponse = {
  items: AdminExperience[]
  total: number
}

export type AnalyticsSummary = {
  total: number
  selected: number
  waiting: number
  rejected: number
  success_rate: number
  experiences_total: number
  approved: number
  pending: number
  rejected_submissions: number
  evaluations_used: number
  evaluation_limit: number
  saved_count: number
  recent: Interview[]
}

export type MonthlyActivity = {
  month: string
  total: number
  selected: number
  rejected: number
}

export type CompanyDistribution = {
  company: string
  count: number
}
