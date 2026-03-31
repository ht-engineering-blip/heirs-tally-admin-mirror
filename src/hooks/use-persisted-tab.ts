'use client'

import { useState, useCallback } from 'react'

/**
 * Persists the active tab in URL search params so it survives page refreshes.
 * Uses window.location + history.replaceState to avoid requiring a Suspense boundary.
 */
export function usePersistedTab(defaultValue: string, paramName = 'tab') {
  const [tab, setTabState] = useState<string>(() => {
    if (typeof window === 'undefined') return defaultValue
    const params = new URLSearchParams(window.location.search)
    return params.get(paramName) || defaultValue
  })

  const setTab = useCallback(
    (value: string) => {
      setTabState(value)
      const url = new URL(window.location.href)
      if (value === defaultValue) {
        url.searchParams.delete(paramName)
      } else {
        url.searchParams.set(paramName, value)
      }
      window.history.replaceState({}, '', url.toString())
    },
    [defaultValue, paramName]
  )

  return [tab, setTab] as const
}
