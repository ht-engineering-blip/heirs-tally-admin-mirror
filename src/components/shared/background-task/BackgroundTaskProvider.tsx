'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { FloatingTaskPanel } from './FloatingTaskPanel'

export interface BackgroundTask {
  id: string
  label: string
  status: 'running' | 'success' | 'error'
  errorMessage?: string
  startedAt: number
}

interface BackgroundTaskContextValue {
  tasks: BackgroundTask[]
  addTask: (task: Omit<BackgroundTask, 'startedAt'>) => void
  updateTask: (id: string, updates: Partial<Omit<BackgroundTask, 'id' | 'startedAt'>>) => void
  removeTask: (id: string) => void
}

export const BackgroundTaskContext = createContext<BackgroundTaskContextValue | null>(null)

export function useBackgroundTaskContext() {
  const ctx = useContext(BackgroundTaskContext)
  if (!ctx) throw new Error('useBackgroundTask must be used within BackgroundTaskProvider')
  return ctx
}

export function BackgroundTaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<BackgroundTask[]>([])

  const addTask = useCallback((task: Omit<BackgroundTask, 'startedAt'>) => {
    setTasks(prev => [...prev, { ...task, startedAt: Date.now() }])
  }, [])

  const updateTask = useCallback((id: string, updates: Partial<Omit<BackgroundTask, 'id' | 'startedAt'>>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }, [])

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <BackgroundTaskContext.Provider value={{ tasks, addTask, updateTask, removeTask }}>
      {children}
      <FloatingTaskPanel />
    </BackgroundTaskContext.Provider>
  )
}
