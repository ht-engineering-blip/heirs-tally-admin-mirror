'use client'

import app from '@/types/server'
import { treaty } from '@elysiajs/eden'
import Cookies from 'js-cookie'
import { signOut } from 'next-auth/react'

const API_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || `${window.location.origin}/api/v1`)
  : process.env.NEXT_PUBLIC_API_URL || '/api/v1'

const COOKIE_OPTIONS = { expires: 7, path: '/', sameSite: 'lax' } as const

function getAccessToken(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return Cookies.get('access_token')
}

// Singleton refresh promise — prevents multiple simultaneous refresh calls
// when several requests 401 at the same time.
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const currentToken = getAccessToken()
    if (!currentToken) return null

    try {
      const res = await fetch(`${API_URL}/tenants/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
      })

      if (!res.ok) return null

      const body = await res.json()
      const newToken = body?.data?.token
      if (newToken) {
        Cookies.set('access_token', newToken, COOKIE_OPTIONS)
        return newToken as string
      }
      return null
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

let isSigningOut = false

function triggerSignOut() {
  if (isSigningOut || typeof window === 'undefined') return
  isSigningOut = true
  signOut({ callbackUrl: '/auth/login' }).finally(() => {
    isSigningOut = false
  })
}

// Fetcher used by Eden Treaty — intercepts 401, attempts token refresh,
// retries the original request once with the new token before giving up.
async function fetchWithRefresh(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init ?? {})

  if (res.status !== 401) return res

  const newToken = await refreshAccessToken()

  if (!newToken) {
    triggerSignOut()
    return res
  }

  // Retry original request with the refreshed token
  return fetch(input, {
    ...init,
    headers: {
      ...((init?.headers as Record<string, string>) || {}),
      Authorization: `Bearer ${newToken}`,
    },
  })
}

const sharedConfig = {
  fetch: { credentials: 'include' as const },
  headers: [
    { 'Content-Type': 'application/json' },
    () => {
      const token = getAccessToken()
      return token ? { Authorization: `Bearer ${token}` } : undefined
    },
  ],
  fetcher: fetchWithRefresh,
}

export const api = treaty<typeof app>(API_URL, sharedConfig)


export function getTenantApiClient() {
  return treaty<typeof app>(`${API_URL}/tenants`, sharedConfig)
}

export function createTenantWebhookListener(webhookURL: string) {
  return treaty<typeof app>(`${webhookURL}`, sharedConfig)
}

export function getAdminApiClient() {
  return treaty<typeof app>(`${API_URL}/admin`, sharedConfig)
}

// Direct fetch helper for non-Eden routes — same refresh-and-retry logic.
export async function fetchAdminApi<T = any>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_URL}${path}`
  const token = getAccessToken()

  const response = await fetchWithRefresh(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`)
  }

  return response.json()
}
