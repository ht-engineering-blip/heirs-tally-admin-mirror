'use client'

import app from '@/types/server'
import { treaty } from '@elysiajs/eden'
import { signOut } from 'next-auth/react'

// This will be typed based on your actual API structure
// For now, we'll create a generic client that can be extended

const API_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || `${window.location.origin}/api/v1`)
  : process.env.NEXT_PUBLIC_API_URL || '/api/v1'

// Track if we're already handling a 401 to prevent multiple redirects
let isHandling401 = false

function handle401(response: Response) {
  if (response.status === 401 && !isHandling401 && typeof window !== 'undefined') {
    isHandling401 = true
    signOut({ callbackUrl: '/auth/login' }).finally(() => {
      isHandling401 = false
    })
  }
}

// Shared Eden Treaty config with 401 interceptor
const sharedConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
  fetch: {
    credentials: 'include' as const,
  },
  onResponse: (response: Response) => {
    handle401(response)
  },
}

// Create the Eden Treaty client
// Note: This uses the Elysia instance at /api/v1 which proxies to the middleware API
export const api = treaty<typeof app>(API_URL, sharedConfig)

// Helper function to get typed API client
export function getTenantApiClient() {
  return treaty<typeof app>(`${API_URL}/tenants`, sharedConfig)
}

export function createTenantWebhookListener(webhookURL: string) {
  return treaty<typeof app>(`${webhookURL}`, sharedConfig)
}

export function getAdminApiClient() {
  return treaty<typeof app>(`${API_URL}/admin`, sharedConfig)
}

// Direct fetch helper for non-Eden routes
export async function fetchAdminApi<T = any>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_URL}${path}`
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  handle401(response)

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`)
  }

  return response.json()
}