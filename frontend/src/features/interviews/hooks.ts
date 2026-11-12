import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Company,
  Difficulty,
  Interview,
  InterviewDetail,
  InterviewMode,
  InterviewStatus,
  InterviewType,
  PublicIdentity,
  Question,
  QuestionCategory,
  Round,
} from '@/types'

export type InterviewInput = {
  company_id?: string
  company_name?: string
  role: string
  interview_type?: InterviewType
  date?: string | null
  status: InterviewStatus
  experience_description?: string | null
  difficulty?: Difficulty | null
  interview_mode?: InterviewMode | null
  publish_consent?: boolean
  public_identity?: PublicIdentity
}

export type SubmitInput = {
  publish_consent: boolean
  public_identity: PublicIdentity
  experience_description?: string | null
  difficulty?: Difficulty | null
  interview_mode?: InterviewMode | null
}

export function useInterviews(filters?: { status?: string; company?: string; q?: string }) {
  return useQuery({
    queryKey: ['interviews', filters],
    queryFn: async () => {
      const { data } = await api.get<Interview[]>('/interviews', { params: filters })
      return data
    },
  })
}

export function useInterview(id: string) {
  return useQuery({
    queryKey: ['interviews', id],
    queryFn: async () => {
      const { data } = await api.get<InterviewDetail>(`/interviews/${id}`)
      return data
    },
    enabled: Boolean(id),
  })
}

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await api.get<Company[]>('/companies')
      return data
    },
  })
}

export function useCreateInterview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: InterviewInput) => api.post<Interview>('/interviews', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['interviews'] }),
  })
}

export function useUpdateInterview(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<InterviewInput>) => api.put<Interview>(`/interviews/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] })
      qc.invalidateQueries({ queryKey: ['interviews', id] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

export function useSubmitInterview(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SubmitInput) => api.post<Interview>(`/interviews/${id}/submit`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

export function useWithdrawInterview(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<Interview>(`/interviews/${id}/withdraw`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

export function useDeleteInterview(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(`/interviews/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

export function useCreateRound(interviewId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.post(`/interviews/${interviewId}/rounds`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['interviews', interviewId] }),
  })
}

export function useDeleteRound() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (roundId: string) => api.delete(`/rounds/${roundId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['interviews'] }),
  })
}

export function useCreateQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      roundId: string
      question: string
      user_answer: string
      category: QuestionCategory
    }) =>
      api.post(`/rounds/${input.roundId}/questions`, {
        question: input.question,
        user_answer: input.user_answer,
        category: input.category,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] })
      qc.invalidateQueries({ queryKey: ['questions'] })
    },
  })
}

export function useDeleteQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (questionId: string) => api.delete(`/questions/${questionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] })
      qc.invalidateQueries({ queryKey: ['questions'] })
    },
  })
}

export function useAnalyzeQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (questionId: string) =>
      api.post<{ question: Question }>(`/questions/${questionId}/analyze`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] })
      qc.invalidateQueries({ queryKey: ['questions'] })
    },
  })
}

export type { Round, Question }
