'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Persists the active tab in URL search params so it survives page refreshes.
 * Uses window.location + history.replaceState to avoid requiring a Suspense boundary.
 */
export function usePersistedTab(defaultValue: string, paramName = 'tab') {
  // Always start with defaultValue to match SSR output, then sync from URL after mount
  const [tab, setTabState] = useState<string>(defaultValue)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromUrl = params.get(paramName)
    if (fromUrl && fromUrl !== defaultValue) {
      setTabState(fromUrl)
    }
  }, [defaultValue, paramName])

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
