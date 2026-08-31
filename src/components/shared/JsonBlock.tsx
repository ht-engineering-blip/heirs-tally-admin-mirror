'use client'

import { cn } from '@/lib/utils'

const URL_REGEX = /(https?:\/\/[^\s"'<>]+)/g

/**
 * Normalizes JSON for display: if the value arrives as an already-serialized
 * JSON string (common for metadata/payload fields coming straight off the
 * wire) it's parsed first so it always pretty-prints with 2-space indent —
 * never shown as a raw unformatted string.
 */
function normalize(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

/** Same parse-first-then-pretty-print normalization `JsonBlock` renders with — exported for copy-to-clipboard buttons so the copied text always matches what's on screen. */
export function stringifyJson(data: unknown): string {
  const normalized = normalize(data)
  return typeof normalized === 'string' ? normalized : JSON.stringify(normalized, undefined, 2)
}

/**
 * Splits pretty-printed JSON text on URLs and renders them as real links.
 * URL_REGEX has one capturing group, so String.split places the captured
 * matches at odd indices and surrounding text at even ones — using that
 * parity avoids re-testing the same global-flag regex in a loop, which
 * would otherwise misfire due to its stateful lastIndex.
 */
function linkify(text: string) {
  const parts = text.split(URL_REGEX)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary/80 break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

interface JsonBlockProps {
  data: unknown
  className?: string
  emptyText?: string
}

interface KeyValueTableProps {
  data: unknown
  className?: string
  emptyText?: string
}

/**
 * Two-column key/value table for flat-ish objects like metadata — keys on
 * the left, values on the right. Falls back to `JsonBlock` when the
 * normalized data isn't a plain object (array, primitive, unparsed string),
 * since a key/value table doesn't make sense for those. A value that's
 * itself an object/array is shown as pretty-printed JSON within its cell
 * rather than forcing it into a single table row.
 */
export function KeyValueTable({ data, className, emptyText = 'No data' }: KeyValueTableProps) {
  if (data === null || data === undefined) {
    return <p className="text-xs text-muted-foreground">{emptyText}</p>
  }

  const normalized = normalize(data)

  if (typeof normalized !== 'object' || normalized === null || Array.isArray(normalized)) {
    return <JsonBlock data={normalized} className={className} emptyText={emptyText} />
  }

  const entries = Object.entries(normalized as Record<string, unknown>)
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyText}</p>
  }

  return (
    <div className={cn('rounded-lg border', className)}>
      <table className="w-full text-xs table-fixed">
        <tbody>
          {entries.map(([key, value], i) => (
            <tr key={key} className={cn(i > 0 && 'border-t')}>
              <td className="p-2 w-1/3 font-mono font-medium text-muted-foreground bg-muted/30 align-top break-all">
                {key}
              </td>
              <td className="p-2 align-top break-all">
                {value === null ? (
                  <span className="text-muted-foreground italic">null</span>
                ) : value === undefined ? (
                  <span className="text-muted-foreground italic">—</span>
                ) : typeof value === 'object' ? (
                  <pre className="whitespace-pre-wrap break-all font-mono">{JSON.stringify(value, undefined, 2)}</pre>
                ) : (
                  linkify(String(value))
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Read-only JSON display used in detail modals: parses stringified JSON
 * before pretty-printing (so nothing renders as a raw unformatted blob),
 * linkifies URLs found in the output, and wraps long lines/tokens instead
 * of allowing horizontal overflow.
 */
export function JsonBlock({ data, className, emptyText = 'No data' }: JsonBlockProps) {
  if (data === null || data === undefined) {
    return <p className="text-xs text-muted-foreground">{emptyText}</p>
  }

  const text = stringifyJson(data)

  return (
    <pre
      className={cn(
        'text-xs font-mono bg-muted/50 rounded-lg p-3 whitespace-pre-wrap break-all overflow-y-auto max-h-[300px]',
        className
      )}
    >
      {linkify(text)}
    </pre>
  )
}
