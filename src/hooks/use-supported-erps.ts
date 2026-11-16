'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAdminApiClient } from '@/lib/api/client'
import { useSession } from '@/hooks/use-session'

export interface ErpListItem {
  id: string
  status: string
  source_type: string
  last_updated?: string
}

export const SUPPORTED_ERPS_QUERY_KEY = ['supported-erps']

export async function fetchSupportedErps(): Promise<ErpListItem[]> {
  const api = getAdminApiClient()
  const response = await api.v1.admin.config['supported-erps'].get()

  if (response.error) {
    throw new Error(
      (response.error as any)?.value?.error || 'Failed to fetch supported ERPs'
    )
  }

  return (response.data?.data ?? []) as unknown as ErpListItem[]
}

interface UseSupportedErpsOptions {
  /** Return ERPs of all statuses, not just active */
  includeAll?: boolean
}

/** Format an ERP source_type for display: e.g. "TALLY_ERP" → "TALLY ERP" */
export function formatErpName(name: string): string {
  return name.replace(/_/g, ' ')
}

export function useSupportedErps(options: UseSupportedErpsOptions = {}) {
  const { includeAll = false } = options
  const { isAuthenticated, isSuperAdmin, isPlatformAdmin } = useSession()

  const query = useQuery({
    queryKey: SUPPORTED_ERPS_QUERY_KEY,
    queryFn: fetchSupportedErps,
    // The underlying endpoint goes through the /api/v1/admin proxy, which
    // attaches the shared admin key server-side regardless of role — so
    // this is readable by platform admins too (e.g. the monitoring filters),
    // not just super admins.
    enabled: isAuthenticated && (isSuperAdmin || isPlatformAdmin),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const erps = query.data ?? []

  const filteredErps = includeAll
    ? erps
    : erps.filter((e) => e.status === 'active')

  const erpOptions = filteredErps.map((e) => e.source_type)

  return {
    erps: filteredErps,
    erpOptions,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
