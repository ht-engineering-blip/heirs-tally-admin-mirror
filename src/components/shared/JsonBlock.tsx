'use client'

import { cn } from '@/lib/utils'

const URL_REGEX = /(https?:\/\/[^\s"'<>]+)/g
// Trailing punctuation that's almost never actually part of the URL itself
// (e.g. "see https://example.com." or "(https://example.com)") — stripped
// only for the dedicated Links list, not from inline linkify, since a
// standalone link that 404s on a trailing period is worse than one that
// keeps it.
const TRAILING_PUNCTUATION_REGEX = /[.,;:)\]]+$/

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

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
}

/**
 * Decodes HTML entities (&amp;, &#61;, &#x3D;, etc.) back to their literal
 * characters. A link extracted from raw HTML (e.g. a verify-email template
 * stored in metadata) is only valid once decoded — HTML authoring escapes
 * everything inside it, so an href's query string shows up as
 * "?token=1&amp;email=2" (or even "&#x3D;" for "=", depending on how it was
 * escaped), which the browser can't resolve as-is. Prefers the browser's own
 * HTML parser (the complete, standard way to do this, and the one that
 * handles every named entity without a hand-maintained table) and falls
 * back to a small manual decoder — named entities plus numeric/hex
 * references — when `document` isn't available.
 */
function decodeHtmlEntities(text: string): string {
  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = text
    return textarea.value
  }

  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => NAMED_HTML_ENTITIES[name] ?? match)
}

/**
 * Recursively walks any value — object, array, or a string that may itself
 * be raw HTML (e.g. an email-body field with an `<a href="...">` tag) or
 * serialized JSON — and pulls out every http(s) URL found anywhere inside
 * it, deduped and in first-seen order. Used to surface a standalone,
 * guaranteed-clickable Links list alongside a metadata/payload block whose
 * own rendering (JsonBlock/KeyValueTable) already inline-linkifies but can
 * be easy to miss inside a large blob of raw markup.
 */
export function extractLinks(data: unknown): string[] {
  const found = new Set<string>()

  const walk = (value: unknown): void => {
    if (value === null || value === undefined) return

    if (typeof value === 'string') {
      const normalized = normalize(value)
      if (typeof normalized !== 'string') {
        walk(normalized)
        return
      }
      const decoded = decodeHtmlEntities(normalized)
      const matches = decoded.match(URL_REGEX)
      if (matches) {
        for (const match of matches) {
          found.add(match.replace(TRAILING_PUNCTUATION_REGEX, ''))
        }
      }
      return
    }

    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }

    if (typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach(walk)
    }
  }

  walk(data)
  return Array.from(found)
}

/**
 * Recursively walks any value — object, array, or a string that may itself
 * be raw HTML (e.g. an email-body field with an `<a href="...">` tag) or
 * serialized JSON — and pulls out every http(s) URL found anywhere inside
 * it, deduped and in first-seen order. Used to surface a standalone,
 * guaranteed-clickable Links list alongside a metadata/payload block whose
 * own rendering (JsonBlock/KeyValueTable) already inline-linkifies but can
 * be easy to miss inside a large blob of raw markup.
 */
export function extractLinks(data: unknown): string[] {
  const found = new Set<string>()

  const walk = (value: unknown): void => {
    if (value === null || value === undefined) return

    if (typeof value === 'string') {
      const normalized = normalize(value)
      if (typeof normalized !== 'string') {
        walk(normalized)
        return
      }
      const matches = normalized.match(URL_REGEX)
      if (matches) {
        for (const match of matches) {
          found.add(match.replace(TRAILING_PUNCTUATION_REGEX, ''))
        }
      }
      return
    }

    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }

    if (typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach(walk)
    }
  }

  walk(data)
  return Array.from(found)
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
                ) : (() => {
                  // Also normalize per-cell: a value can itself be a
                  // serialized-JSON string (e.g. a nested payload field),
                  // in which case it should pretty-print + linkify too.
                  const cellValue = normalize(value)
                  return typeof cellValue === 'object' && cellValue !== null ? (
                    <pre className="whitespace-pre-wrap break-all font-mono">
                      {linkify(JSON.stringify(cellValue, undefined, 2))}
                    </pre>
                  ) : (
                    linkify(String(cellValue))
                  )
                })()}
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
