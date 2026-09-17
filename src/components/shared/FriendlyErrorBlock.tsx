'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { JsonBlock } from './JsonBlock';
import type { FriendlyError } from '@/lib/errors/friendly-invoice-error';

/**
 * Finds a balanced {...}/[...] JSON substring within arbitrary text (e.g.
 * "ERP sync request failed: 404 Not Found — {\"error\":...}") by scanning
 * bracket depth while respecting string literals, rather than naively
 * splitting on a separator — the surrounding text is never itself JSON, so
 * a whole-string JSON.parse would just fail on messages like this.
 */
function extractEmbeddedJson(text: string): { before: string; json: unknown; after: string } | null {
  const startIdx = text.search(/[{[]/);
  if (startIdx === -1) return null;
  const openChar = text[startIdx];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        try {
          const json = JSON.parse(text.slice(startIdx, i + 1));
          return { before: text.slice(0, startIdx).trim(), json, after: text.slice(i + 1).trim() };
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** Technical-details text, with any JSON in it (whole or embedded) pretty-printed instead of dumped as a raw blob. */
function TechnicalDetails({ raw }: { raw: string }) {
  try {
    return <JsonBlock data={JSON.parse(raw)} className="mt-2" />;
  } catch {
    // not pure JSON — fall through to check for an embedded JSON portion
  }

  const embedded = extractEmbeddedJson(raw);
  if (embedded) {
    return (
      <div className="mt-2 space-y-1.5">
        {embedded.before && (
          <p className="text-xs font-mono text-muted-foreground break-all">{embedded.before}</p>
        )}
        <JsonBlock data={embedded.json} />
        {embedded.after && (
          <p className="text-xs font-mono text-muted-foreground break-all">{embedded.after}</p>
        )}
      </div>
    );
  }

  return (
    <pre className="mt-2 p-2 bg-background/60 border border-border rounded text-xs font-mono whitespace-pre-wrap break-all text-muted-foreground">
      {raw}
    </pre>
  );
}

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
            <TechnicalDetails raw={error.raw} />
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
