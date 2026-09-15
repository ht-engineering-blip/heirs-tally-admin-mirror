'use client'

import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface WebhookExpiryBadgeProps {
  isExpired: boolean
  expiresAt: string | null
  remainingDays: number | null
  className?: string
}

/**
 * Status badge for a webhook's credential lifespan — red once expired,
 * amber inside the last 7 days, green otherwise, muted for NO_EXPIRATION.
 * Uses the same success/warning/destructive/muted tokens StatusBadge does
 * rather than inventing new colors; no existing "expires in X days"
 * pattern exists elsewhere in this codebase to match instead.
 */
export function WebhookExpiryBadge({ isExpired, expiresAt, remainingDays, className }: WebhookExpiryBadgeProps) {
  if (isExpired) {
    return (
      <span className={cn('status-badge bg-destructive/10 text-destructive', className)}>
        Expired
      </span>
    )
  }

  if (!expiresAt) {
    return (
      <span className={cn('status-badge bg-muted text-muted-foreground', className)}>
        No expiration
      </span>
    )
  }

  if (remainingDays !== null && remainingDays <= 7) {
    return (
      <span className={cn('status-badge bg-warning/10 text-warning', className)}>
        Expires in {remainingDays} {remainingDays === 1 ? 'day' : 'days'}
      </span>
    )
  }

  return (
    <span className={cn('status-badge bg-success/10 text-success', className)}>
      Expires on {format(new Date(expiresAt), 'dd/MM/yyyy')}
    </span>
  )
}
