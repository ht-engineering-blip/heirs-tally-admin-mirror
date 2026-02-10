'use client'

import { treaty } from '@elysiajs/eden'
import app from '@/types/server'
 
// This will be typed based on your actual API structure
// For now, we'll create a generic client that can be extended 

const API_URL = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_API_URL || `${window.location.origin}/api/v1`)
  : process.env.NEXT_PUBLIC_API_URL || '/api/v1'

// Create the Eden Treaty client
// Note: This uses the Elysia instance at /api/v1 which proxies to the middleware API
export const api = treaty<typeof app>(API_URL, {
  headers: {
    'Content-Type': 'application/json',
  },
  fetch: {
    credentials: 'include',
  },
})

// Helper function to get typed API client
export function getTenantApiClient() {
  return treaty<typeof app>(`${API_URL}/tenants`, {
    headers: {
      'Content-Type': 'application/json',
    },
    fetch: {
      credentials: 'include',
    },
  })
}
export function getAdminApiClient() {
  return treaty<typeof app>(`${API_URL}/admin`, {
    headers: {
      'Content-Type': 'application/json',
    },
    fetch: {
      credentials: 'include',
    },
  })
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

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`)
  }

  return response.json()
}
