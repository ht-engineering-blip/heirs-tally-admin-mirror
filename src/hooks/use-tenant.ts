'use client'

import { getTenantApiClient } from '@/lib/api/client'
import { useQuery } from '@tanstack/react-query'
import { useSession } from './use-session'

export function useTenant() {
  const { tenantId: sessionTenantId, isAuthenticated, isBusinessAdmin, isBusinessTeamMember } = useSession()
  const isTenantUser = isBusinessAdmin || isBusinessTeamMember

  const { data, isLoading, error, refetch } = useQuery({
    // Do NOT include sessionTenantId in the key — /me returns data for the current
    // bearer token, not for a specific tenantId. Including it causes an extra query
    // every time the session hydrates (undefined → real id), which creates a loop
    // when /me is failing.
    queryKey: ['tenant-me'],
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
    // retry: false — prevent 3 automatic retries when /me returns 401.
    // Without this, a single 401 spawns 4 requests.
    retry: false,
    // refetchOnWindowFocus: false — prevent re-firing /me on every tab focus when
    // the endpoint is returning errors. NextAuth's own session refresh already
    // keeps the session fresh; we don't need React Query to pile on.
    refetchOnWindowFocus: false,
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
