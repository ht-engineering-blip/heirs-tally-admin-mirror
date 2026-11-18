'use client'

import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  className?: string
  /** Tighter padding for use inside a tab panel or a card that already has its own header. */
  compact?: boolean
  /** Optional action rendered below the description — e.g. a "Retry" button on an error state. */
  action?: React.ReactNode
}

/** Reusable empty state for any list/table/chart panel — an icon + a
 * human title + an optional explanation, instead of a single muted
 * sentence. Give the wrapping container a min-height so swapping between
 * a populated and an empty view doesn't collapse the layout. */
export function EmptyState({ icon: Icon = Inbox, title, description, className, compact = false, action }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center gap-2',
        compact ? 'py-8' : 'py-12',
        className
      )}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-muted-foreground">
        <Icon className="w-5 h-5" />
      </div>
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="text-xs text-muted-foreground max-w-xs">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
