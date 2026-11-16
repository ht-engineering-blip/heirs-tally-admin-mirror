import type {
  PlatformAdminLoginResponse,
  PlatformAdminMeResponse,
  PlatformAdminRefreshResponse,
} from '@/types/platform-admin'

async function platformAdminFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${window.location.origin}/api/v1/platform-admin${path}`
  const res = await fetch(url, {
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

export function createPlatformAdminApi() {
  return {
    login: (email: string, password: string) =>
      platformAdminFetch<PlatformAdminLoginResponse>('/v1/auth/platform-admin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    getMeWithToken: (token: string) =>
      platformAdminFetch<PlatformAdminMeResponse>('/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      }),

    refresh: (token: string) =>
      platformAdminFetch<PlatformAdminRefreshResponse>('/v1/auth/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }),

    forgotPassword: (email: string) =>
      platformAdminFetch<{ success: true; data: { success: true; message: string } }>(
        '/v1/auth/platform-admin/forgot-password',
        { method: 'POST', body: JSON.stringify({ email }) }
      ),

    resetPassword: (token: string, password: string) =>
      platformAdminFetch<{ success: true; data: { success: true; message: string } }>(
        '/v1/auth/platform-admin/reset-password',
        { method: 'POST', body: JSON.stringify({ token, password }) }
      ),
  }
}
