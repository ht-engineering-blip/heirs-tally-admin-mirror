'use client'

import { useQuery } from '@tanstack/react-query'
import { getAdminApiClient } from '@/lib/api/client'

export interface ErpListItem {
  id: string
  status: string
  source_type: string
  last_updated?: string
}

const FALLBACK_ERP_TYPES = [
  'SAP', 'ORACLE', 'ZOHO', 'QUICKBOOKS', 'XERO', 'SAGE',
  'DYNAMICS', 'NETSUITE', 'ODOO', 'FRESHBOOKS', 'WAVE',
  'FIRS_UBL', 'PEPPOL_BIS', 'UBL_2_1',
  'CUSTOM',
]

interface UseSupportedErpsOptions {
  /** Return ERPs of all statuses, not just active */
  includeAll?: boolean
  /** Merge the fallback list so all known ERP types always appear */
  includeFallback?: boolean
}

export function useSupportedErps(options: UseSupportedErpsOptions = {}) {
  const { includeAll = false, includeFallback = false } = options

  const query = useQuery({
    queryKey: ['supported-erps'],
    queryFn: async () => {
      const api = getAdminApiClient()
      const response = await api.v1.admin.config['supported-erps'].get()

      if (response.error) {
        throw new Error(
          (response.error as any)?.value?.error || 'Failed to fetch supported ERPs'
        )
      }

      return (response.data?.data ?? []) as unknown as ErpListItem[]
    },
    staleTime: 5 * 60 * 1000,
  })

  const erps = query.data ?? []

  const filteredErps = includeAll
    ? erps
    : erps.filter((e) => e.status === 'active')

  const apiTypes = filteredErps.map((e) => e.source_type)

  let erpOptions: string[]
  if (apiTypes.length === 0) {
    // API returned nothing — use full fallback
    erpOptions = FALLBACK_ERP_TYPES
  } else if (includeFallback) {
    // Merge: API types first, then any fallback types not already present
    const set = new Set(apiTypes)
    erpOptions = [...apiTypes, ...FALLBACK_ERP_TYPES.filter((t) => !set.has(t))]
  } else {
    erpOptions = apiTypes
  }

  return {
    erps: filteredErps,
    erpOptions,
    isLoading: query.isLoading,
    error: query.error,
    isFallback: apiTypes.length === 0,
  }
}
