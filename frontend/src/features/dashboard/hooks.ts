import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AnalyticsSummary, CompanyDistribution, MonthlyActivity } from '@/types'

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const { data } = await api.get<AnalyticsSummary>('/analytics/summary')
      return data
    },
  })
}

export function useMonthlyActivity() {
  return useQuery({
    queryKey: ['analytics', 'monthly'],
    queryFn: async () => {
      const { data } = await api.get<MonthlyActivity[]>('/analytics/monthly')
      return data
    },
  })
}

export function useCompanyDistribution() {
  return useQuery({
    queryKey: ['analytics', 'companies'],
    queryFn: async () => {
      const { data } = await api.get<CompanyDistribution[]>('/analytics/companies')
      return data
    },
  })
}
