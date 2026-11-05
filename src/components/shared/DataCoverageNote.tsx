import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface DataCoverageNoteProps {
  /** The backend's own caveat string for this metric/section — shown verbatim, never paraphrased. */
  text: string
  className?: string
}

/**
 * Surfaces a backend-authored `dataCoverage` caveat (e.g. "rectified
 * under-counts legacy records with incomplete resolution history") next to
 * the metric it describes. These are real, intentional caveats from the
 * backend team, not boilerplate — the monitoring API contract is explicit
 * that they must stay visible, not be dropped for a cleaner-looking card.
 */
export function DataCoverageNote({ text, className }: DataCoverageNoteProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors',
              className
            )}
            aria-label="Data coverage note"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
