'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { FriendlyError } from '@/lib/errors/friendly-invoice-error';

/**
 * Renders a humanized error (headline + optional detail) with the original
 * raw message tucked behind a "Show technical details" toggle — never
 * hidden, just not the first thing a user has to parse.
 */
export function FriendlyErrorBlock({
  title,
  error,
  className,
}: {
  title?: string;
  error: FriendlyError;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const hasRawDetails = !!error.raw && error.raw.trim() !== error.headline.trim();

  return (
    <div className={cn('p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2', className)}>
      {title && <p className="text-sm font-medium text-destructive">{title}</p>}
      <p className="text-sm text-foreground">{error.headline}</p>
      {error.detail && <p className="text-xs text-muted-foreground">{error.detail}</p>}
      {hasRawDetails && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {open ? 'Hide' : 'Show'} technical details
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="mt-2 p-2 bg-background/60 border border-border rounded text-xs font-mono whitespace-pre-wrap break-all text-muted-foreground">
              {error.raw}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
