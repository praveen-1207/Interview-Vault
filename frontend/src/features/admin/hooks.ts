import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AdminExperience, AdminListResponse, PublicationStatus } from '@/types'

export type AdminFilters = {
  status?: PublicationStatus | ''
  page?: number
  page_size?: number
}

export function useAdminExperiences(filters: AdminFilters) {
  return useQuery({
    queryKey: ['admin', 'experiences', filters],
    queryFn: async () => {
      const { data } = await api.get<AdminListResponse>('/admin/experiences', {
        params: { ...filters, status: filters.status || undefined },
      })
      return data
    },
  })
}

export function useApproveExperience() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (interviewId: string) =>
      api.post<AdminExperience>(`/admin/experiences/${interviewId}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
      qc.invalidateQueries({ queryKey: ['community'] })
    },
  })
}

export function useRejectExperience() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { interviewId: string; reason: string }) =>
      api.post<AdminExperience>(`/admin/experiences/${input.interviewId}/reject`, {
        reason: input.reason,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
      qc.invalidateQueries({ queryKey: ['community'] })
    },
  })
}
