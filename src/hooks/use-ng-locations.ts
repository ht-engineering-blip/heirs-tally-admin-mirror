'use client'

import { useQuery } from '@tanstack/react-query'
import { createTenantApi } from '@/lib/api/tenant-api'
import type { NgLga, NgState } from '@/types/tenant-profile'

// Public, effectively-static reference data — cache aggressively.
const STALE_TIME = 60 * 60 * 1000

export function useNgStates() {
  return useQuery({
    queryKey: ['ng-states'],
    queryFn: async (): Promise<NgState[]> => {
      const res = await createTenantApi().getStates()
      if (res.error) throw new Error('Failed to load states')
      return (res.data as any)?.data ?? []
    },
    staleTime: STALE_TIME,
  })
}

export function useNgLgas() {
  return useQuery({
    queryKey: ['ng-lgas'],
    queryFn: async (): Promise<NgLga[]> => {
      const res = await createTenantApi().getLgas()
      if (res.error) throw new Error('Failed to load LGAs')
      return (res.data as any)?.data ?? []
    },
    staleTime: STALE_TIME,
  })
}
