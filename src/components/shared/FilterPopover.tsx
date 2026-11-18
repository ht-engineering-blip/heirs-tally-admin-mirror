'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterPopoverProps {
  /** Number of filter fields currently set — shown as a badge on the trigger. */
  activeCount: number
  onClear?: () => void
  children: React.ReactNode
  align?: 'start' | 'center' | 'end'
  /** Popover content width — override for forms with more/fewer fields. */
  contentClassName?: string
  triggerLabel?: string
  /** When set, edits inside the popover only commit when this fires — the
   * popover renders an "Apply filters" footer button instead of applying on
   * every field change. Pressing it also closes the popover. */
  onApply?: () => void
  applyLabel?: string
  /** Controlled open state — lets the caller reset its draft fields back to
   * the committed filters each time the popover opens. Falls back to
   * internal state when omitted. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/** A single "Filters" button that opens a popover of filter fields, instead
 * of a permanently-expanded filter bar taking up page space. Shared across
 * any page that needs a filter form (first adopted by the Monitoring
 * dashboard) — pass the actual field inputs as children. */
export function FilterPopover({
  activeCount,
  onClear,
  children,
  align = 'start',
  contentClassName,
  triggerLabel = 'Filters',
  onApply,
  applyLabel = 'Apply filters',
  open: openProp,
  onOpenChange,
}: FilterPopoverProps) {
  const [openState, setOpenState] = useState(false)
  const open = openProp ?? openState
  const setOpen = onOpenChange ?? setOpenState

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          {triggerLabel}
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px] h-4 min-w-4 justify-center">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className={cn('w-[min(92vw,420px)] p-4', contentClassName)}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium">{triggerLabel}</p>
          <div className="flex items-center gap-1">
            {activeCount > 0 && onClear && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClear}>
                <X className="w-3 h-3 mr-1" /> Clear all
              </Button>
            )}
            {onApply && (
              <Button size="sm" className="h-7 px-2.5 text-xs" onClick={() => { onApply(); setOpen(false) }}>
                {applyLabel}
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-4">{children}</div>
      </PopoverContent>
    </Popover>
  )
}
