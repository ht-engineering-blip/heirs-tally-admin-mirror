'use client'

import { CheckCircle2, Loader2, X, XCircle } from 'lucide-react'
import { useBackgroundTaskContext, type BackgroundTask } from './BackgroundTaskProvider'
import { cn } from '@/lib/utils'

export function FloatingTaskPanel() {
  const { tasks, removeTask } = useBackgroundTaskContext()

  if (tasks.length === 0) return null

  return (
    <div
      role="region"
      aria-label="Background tasks"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-72 pointer-events-none"
    >
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} onDismiss={() => removeTask(task.id)} />
      ))}
    </div>
  )
}

function TaskCard({ task, onDismiss }: { task: BackgroundTask; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        'pointer-events-auto relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-lg',
        'animate-in slide-in-from-bottom-4 fade-in-0 duration-300',
        task.status === 'success' && 'border-success/50',
        task.status === 'error' && 'border-destructive/50',
      )}
    >
      {/* Indeterminate progress bar */}
      {task.status === 'running' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden bg-muted">
          <div className="absolute h-full w-1/3 bg-primary animate-task-progress" />
        </div>
      )}

      <div className="flex items-start gap-3 p-3 pr-8">
        <div className="mt-0.5 shrink-0">
          {task.status === 'running' && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {task.status === 'success' && (
            <CheckCircle2 className="h-4 w-4 text-success" />
          )}
          {task.status === 'error' && (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug truncate">{task.label}</p>
          <p className={cn(
            'text-xs mt-0.5 leading-snug',
            task.status === 'running' && 'text-muted-foreground',
            task.status === 'success' && 'text-success',
            task.status === 'error' && 'text-destructive',
          )}>
            {task.status === 'running' && 'Running in background…'}
            {task.status === 'success' && 'Completed successfully'}
            {task.status === 'error' && (task.errorMessage || 'Something went wrong')}
          </p>
        </div>
      </div>

      {task.status !== 'running' && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="absolute top-2 right-2 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
