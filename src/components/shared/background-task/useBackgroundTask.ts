'use client'

import { useCallback } from 'react'
import { useBackgroundTaskContext } from './BackgroundTaskProvider'

export interface BackgroundTaskRunOptions {
  /** Label shown in the floating panel (e.g. "Creating tenant") */
  label: string
  /** The async work to run. Throw an Error to signal failure. */
  fn: () => Promise<void>
  /**
   * How long (ms) to wait before the task is pushed to background.
   * Default: 5000ms
   */
  threshold?: number
  /**
   * Called when the threshold fires and the task is backgrounded.
   * Use this to close/minimize the calling modal.
   */
  onMinimize?: () => void
  /**
   * Called on success. Fires in both the fast path and the background path.
   * Safe for refetches and toasts. Avoid modal-specific state if modal may
   * already be closed (i.e. after onMinimize was called).
   */
  onSuccess?: () => void
  /**
   * Called on error. Fires in both the fast path and the background path.
   * In the background path the floating panel also shows the error, so
   * avoid showing a duplicate toast if minimized.
   */
  onError?: (err: Error) => void
}

let taskCounter = 0

export function useBackgroundTask() {
  const { addTask, updateTask, removeTask } = useBackgroundTaskContext()

  const run = useCallback(
    (options: BackgroundTaskRunOptions) => {
      const {
        label,
        fn,
        threshold = 5000,
        onMinimize,
        onSuccess,
        onError,
      } = options

      const id = `bgtask-${++taskCounter}-${Date.now()}`
      let backgrounded = false

      const pushToBackground = () => {
        if (backgrounded) return
        backgrounded = true
        clearTimeout(timer)
        addTask({ id, label, status: 'running' })
        onMinimize?.()
      }

      const timer = setTimeout(pushToBackground, threshold)

      fn()
        .then(() => {
          clearTimeout(timer)
          if (backgrounded) {
            updateTask(id, { status: 'success' })
            setTimeout(() => removeTask(id), 4000)
          }
          onSuccess?.()
        })
        .catch((err: unknown) => {
          clearTimeout(timer)
          const error = err instanceof Error ? err : new Error(String(err))
          if (backgrounded) {
            updateTask(id, { status: 'error', errorMessage: error.message })
            setTimeout(() => removeTask(id), 6000)
          }
          onError?.(error)
        })

      return { minimize: pushToBackground }
    },
    [addTask, updateTask, removeTask],
  )

  return { run }
}
