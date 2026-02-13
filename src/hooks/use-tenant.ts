'use client'

import { useQuery } from '@tanstack/react-query'
import { useSession } from './use-session'
import { getTenantApiClient } from '@/lib/api/client'

export function useTenant() {
  const { tenantId: sessionTenantId, isAuthenticated, isBusinessAdmin, isBusinessTeamMember } = useSession()
  const isTenantUser = isBusinessAdmin || isBusinessTeamMember

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tenant-me', sessionTenantId],
    queryFn: async () => {
      const api = getTenantApiClient()
      const response = await api.v1.auth.me.get()
      if (response.error) {
        throw new Error((response.error as any)?.value?.error || 'Failed to fetch tenant data')
      }
      return response.data?.data
    },
    enabled: isAuthenticated && isTenantUser,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  // Resolve tenantId from /me response (tenant type has `id`, team member has `tenantId`)
  const resolvedTenantId = sessionTenantId
    || (data && 'id' in data && 'type' in data && (data as any).type === 'tenant' ? (data as any).id : undefined)
    || (data && 'tenantId' in data ? (data as any).tenantId : undefined)

  // Onboarding data (only on tenant-type /me response)
  const onboarding = data && 'onboarding' in data ? (data as any).onboarding : null
  // Onboarding data (only on tenant-type /me response)
  const metadata = data && 'metadata' in data ? (data as any).metadata : null

  return {
    tenantId: resolvedTenantId as string | undefined,
    tenantData: data,
    onboarding,
    onboardingStatus: onboarding?.status || null,
    onboardingProgress: onboarding?.progress || 0,
    onboardingSteps: onboarding?.steps || null,
    isOnboardingComplete: onboarding?.status === 'active',
    isLoading,
    error,
    metadata,
    refetch,
  }
}
