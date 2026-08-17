'use client'

import { createTenantApi } from '@/lib/api/tenant-api'
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
      const api = createTenantApi()
      const response = await api.getMe()
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

  // Onboarding data — present on the tenant-owner /me response but absent on the
  // team member /me response (which is a user record, not a tenant record).
  const onboarding = data && 'onboarding' in data ? (data as any).onboarding : null
  const metadata = data && 'metadata' in data ? (data as any).metadata : null

  // Team members cannot complete onboarding and must never be gated by it.
  // The onboarding endpoint requires a tenant-owner token, so checking it from
  // a team member session would return 403. Instead, bypass the gate entirely:
  // if you're a team member with a resolved tenantId, you see the full dashboard.
  //
  // Long-term backend fix: include tenant onboarding/status data in the team
  // member /me response, or allow GET /v1/tenants/:id/onboarding with member tokens.
  const isOnboardingComplete = isBusinessTeamMember
    ? !!resolvedTenantId
    : onboarding?.steps?.firsProvisioning?.completed === true &&
      onboarding?.steps?.erpConfiguration?.completed === true

  return {
    tenantId: resolvedTenantId as string | undefined,
    tenantData: data,
    onboarding,
    onboardingStatus: onboarding?.status || null,
    onboardingProgress: onboarding?.progress || 0,
    onboardingSteps: onboarding?.steps || null,
    isOnboardingComplete,
    isLoading,
    error,
    metadata,
    refetch,
  }
}
