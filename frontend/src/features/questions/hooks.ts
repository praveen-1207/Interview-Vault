import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Question } from '@/types'

export type QuestionFilters = {
  q?: string
  company?: string
  role?: string
  round?: string
  difficulty?: string
  status?: string
  category?: string
  sort?: 'newest' | 'oldest'
}

export function useQuestions(filters: QuestionFilters) {
  return useQuery({
    queryKey: ['questions', filters],
    queryFn: async () => {
      const { data } = await api.get<Question[]>('/questions/search', { params: filters })
      return data
    },
  })
}

export function useUpdateUserAnswer(questionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (user_answer: string) => api.put(`/questions/${questionId}`, { user_answer }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions'] })
      qc.invalidateQueries({ queryKey: ['interviews'] })
    },
  })
}

export function useReanalyze() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (questionId: string) => api.post(`/questions/${questionId}/analyze`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions'] })
      qc.invalidateQueries({ queryKey: ['interviews'] })
    },
  })
}
