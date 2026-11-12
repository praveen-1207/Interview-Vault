import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  AIEvaluation,
  AIUsage,
  Answer,
  CommunityListResponse,
  CommunityQuestionListResponse,
  Company,
  EvaluateResult,
  PublicExperienceDetail,
  SavedExperience,
} from '@/types'

export type CommunityFilters = {
  q?: string
  company?: string
  role?: string
  difficulty?: string
  category?: string
  sort?: 'newest' | 'oldest'
  page?: number
  page_size?: number
}

export type CommunityQuestionFilters = {
  q?: string
  company?: string
  role?: string
  interview_type?: string
  round_name?: string
  category?: string
  difficulty?: string
  sort?: 'newest' | 'oldest'
  page?: number
  page_size?: number
}

export function useCommunityQuestions(filters: CommunityQuestionFilters) {
  return useQuery({
    queryKey: ['community', 'questions', filters],
    queryFn: async () => {
      const { data } = await api.get<CommunityQuestionListResponse>('/community/questions', {
        params: filters,
      })
      return data
    },
  })
}

export function useCommunityExperiences(filters: CommunityFilters) {
  return useQuery({
    queryKey: ['community', 'experiences', filters],
    queryFn: async () => {
      const { data } = await api.get<CommunityListResponse>('/community/experiences', {
        params: filters,
      })
      return data
    },
  })
}

export function usePublicExperience(id: string) {
  return useQuery({
    queryKey: ['community', 'experience', id],
    queryFn: async () => {
      const { data } = await api.get<PublicExperienceDetail>(`/community/experiences/${id}`)
      return data
    },
    enabled: Boolean(id),
  })
}

export function usePublicCompanies() {
  return useQuery({
    queryKey: ['community', 'companies'],
    queryFn: async () => {
      const { data } = await api.get<Company[]>('/community/companies')
      return data
    },
  })
}

export function useSavedExperiences() {
  return useQuery({
    queryKey: ['community', 'saved'],
    queryFn: async () => {
      const { data } = await api.get<SavedExperience[]>('/community/saved')
      return data
    },
  })
}

export function useSaveExperience(interviewId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(`/community/experiences/${interviewId}/save`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community', 'saved'] }),
  })
}

export function useUnsaveExperience(interviewId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete(`/community/experiences/${interviewId}/save`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community', 'saved'] }),
  })
}

export function useAnswer(interviewId: string, questionId: string) {
  return useQuery({
    queryKey: ['community', 'answer', interviewId, questionId],
    queryFn: async () => {
      const { data } = await api.get<Answer>(
        `/community/experiences/${interviewId}/questions/${questionId}/answer`,
      )
      return data
    },
    enabled: Boolean(interviewId && questionId),
    retry: false,
  })
}

export function useSaveAnswer(interviewId: string, questionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (answer_text: string) =>
      api.put<Answer>(
        `/community/experiences/${interviewId}/questions/${questionId}/answer`,
        { answer_text },
      ),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['community', 'answer', interviewId, questionId] }),
  })
}

export function useEvaluateAnswer(interviewId: string, questionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (answer_text: string) => {
      const { data } = await api.post<EvaluateResult>(
        `/community/experiences/${interviewId}/questions/${questionId}/evaluate`,
        { answer_text },
      )
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'usage', interviewId] })
      qc.invalidateQueries({ queryKey: ['community', 'evaluation', interviewId, questionId] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

export function useEvaluation(interviewId: string, questionId: string) {
  return useQuery({
    queryKey: ['community', 'evaluation', interviewId, questionId],
    queryFn: async () => {
      const { data } = await api.get<AIEvaluation>(
        `/community/experiences/${interviewId}/questions/${questionId}/evaluation`,
      )
      return data
    },
    enabled: Boolean(interviewId && questionId),
    retry: false,
  })
}

export function useAIUsage(interviewId: string) {
  return useQuery({
    queryKey: ['community', 'usage', interviewId],
    queryFn: async () => {
      const { data } = await api.get<AIUsage>(`/community/experiences/${interviewId}/ai-usage`)
      return data
    },
    enabled: Boolean(interviewId),
  })
}
