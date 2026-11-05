import type {
  CreatePlatformAdminPayload,
  PlatformAdminSummary,
  UpdatePlatformAdminPayload,
} from '@/types/platform-admin'

// Account provisioning is gated by the shared x-admin-key infrastructure
// secret, not a platform-admin bearer token (see
// docs/platform-admin-and-monitoring-api-contract.md §2) — so, like
// monitoring data, this goes through the existing /api/v1/admin proxy that
// already attaches it server-side.
async function platformAdminAccountsFetch<T>(
  path: string,
  options: RequestInit = {},
  params?: Record<string, any>
): Promise<T> {
  const url = new URL(`${window.location.origin}/api/v1/admin${path}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== '') url.searchParams.set(key, String(value))
    })
  }

  const res = await fetch(url.toString(), {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const json = await res.json().catch(() => ({}))

  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || json?.message || 'Request failed')
  }

  return json
}

export function createPlatformAdminAccountsApi() {
  return {
    list: (page = 1, limit = 20) =>
      platformAdminAccountsFetch<{
        success: true
        data: { items: PlatformAdminSummary[]; total: number; page: number; limit: number }
      }>('/v1/platform-users', {}, { page, limit }),

    create: (payload: CreatePlatformAdminPayload) =>
      platformAdminAccountsFetch<{ success: true; data: PlatformAdminSummary }>('/v1/platform-users', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    update: (userId: string, payload: UpdatePlatformAdminPayload) =>
      platformAdminAccountsFetch<{ success: true; data: PlatformAdminSummary }>(`/v1/platform-users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
  }
}
