import type {
  MonitoringAlertsResponse,
  MonitoringCompany,
  MonitoringFailuresResponse,
  MonitoringFilters,
  MonitoringHealth,
  MonitoringOverview,
} from '@/types/monitoring'

// Monitoring data is read through the existing /api/v1/admin proxy: its
// static x-admin-key already bypasses the backend's module-permission check
// (see docs/platform-admin-and-monitoring-api-contract.md §3), so this works
// unchanged for both SUPER_ADMIN and PLATFORM_ADMIN sessions — neither needs
// their own bearer token forwarded for monitoring data itself.
async function monitoringFetch<T>(path: string, params?: Record<string, any>): Promise<T> {
  const url = new URL(`${window.location.origin}/api/v1/admin${path}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== '') url.searchParams.set(key, String(value))
    })
  }

  const res = await fetch(url.toString(), { credentials: 'include' })
  const json = await res.json().catch(() => ({}))

  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || json?.message || 'Request failed')
  }

  return json
}

export function createMonitoringApi() {
  return {
    getOverview: (filters: MonitoringFilters) =>
      monitoringFetch<{ success: true; data: MonitoringOverview }>('/v1/monitoring/overview', filters),

    getCompany: (tenantId: string, filters: Omit<MonitoringFilters, 'tenantId' | 'failureCategory'>) =>
      monitoringFetch<{ success: true; data: MonitoringCompany }>(`/v1/monitoring/companies/${tenantId}`, filters),

    getFailures: (filters: MonitoringFilters & { page?: number; limit?: number }) =>
      monitoringFetch<MonitoringFailuresResponse>('/v1/monitoring/failures', filters),

    getHealth: (filters: Pick<MonitoringFilters, 'from' | 'to' | 'tenantId'>) =>
      monitoringFetch<{ success: true; data: MonitoringHealth }>('/v1/monitoring/health', filters),

    getAlerts: (params?: {
      from?: string
      to?: string
      failureRatePercent?: number
      openFailureHours?: number
      apiErrorRatePercent?: number
      apiP95Milliseconds?: number
      crossTenantFailureCount?: number
    }) => monitoringFetch<{ success: true; data: MonitoringAlertsResponse }>('/v1/monitoring/alerts', params),
  }
}
