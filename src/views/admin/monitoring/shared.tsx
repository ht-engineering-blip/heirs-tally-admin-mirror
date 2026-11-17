'use client'

import { DataCoverageNote } from '@/components/shared/DataCoverageNote'
import { EmptyState } from '@/components/shared/EmptyState'
import { FilterPopover } from '@/components/shared/FilterPopover'
import { TenantCombobox } from '@/components/shared/TenantCombobox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatErpName, useSupportedErps } from '@/hooks/use-supported-erps'
import { cn } from '@/lib/utils'
import {
  NRS_DOCUMENT_TYPE_LABELS,
  type FailureCategory,
  type MonitoringAlert,
  type MonitoringFunnel,
  type MonitoringOverview,
  type MonitoringSuccessStageRow,
  type NrsDocumentTypeCode,
} from '@/types/monitoring'
import { format } from 'date-fns'
import { AlertTriangle, CheckCircle2, Inbox, LineChart, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState, type MouseEvent } from 'react'

/** Fixed content height for the daily-trend chart and each breakdown tab
 * panel, in both their loaded and empty states — keeps the layout stable
 * when switching tabs or between loading/loaded/empty, and gives an empty
 * chart/list enough room to visibly read as "this is a chart" / "this is a
 * scrollable list" rather than collapsing to a single line of text. */
const PANEL_MIN_HEIGHT = 'min-h-[260px]'

/** Height bounds for each Breakdown tab's scrollable list — sized to its
 * own content between these bounds instead of a fixed height, so a tab with
 * one row doesn't render as mostly dead whitespace and a tab with many rows
 * scrolls internally past the cap rather than growing the card unbounded. */
const BREAKDOWN_LIST_HEIGHT = 'min-h-[120px] max-h-[280px] overflow-y-auto'

export const FAILURE_CATEGORIES: { value: FailureCategory; label: string }[] = [
  { value: 'schema_validation', label: 'Schema validation' },
  { value: 'mapping_configuration', label: 'Mapping configuration' },
  { value: 'business_rule', label: 'Business rule' },
  { value: 'nrs_rejection', label: 'NRS rejection' },
  { value: 'transport_timeout', label: 'Transport / timeout' },
  { value: 'auth_credential', label: 'Auth / credential' },
  { value: 'unknown', label: 'Unknown' },
]

export const DOCUMENT_TYPE_OPTIONS = Object.entries(NRS_DOCUMENT_TYPE_LABELS) as [NrsDocumentTypeCode, string][]

export const FAILURE_PAGE_SIZE = 20

export function formatSeconds(value: number | null): string {
  if (value === null) return '—'
  return `${value.toFixed(2)}s`
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return format(new Date(value), 'MMM d, yyyy HH:mm')
  } catch {
    return value
  }
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(0)}s`
  const minutes = seconds / 60
  if (minutes < 60) return `${minutes.toFixed(0)}m`
  return `${(minutes / 60).toFixed(1)}h`
}

export function toIso(localDateTime: string): string | undefined {
  if (!localDateTime) return undefined
  const date = new Date(localDateTime)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Default "To" — always today (now), in <input type="datetime-local"> format. */
export function defaultRangeTo(): string {
  return toDatetimeLocalValue(new Date())
}

/** Default "From" — 90 days before the default "To". */
export function defaultRangeFrom(): string {
  const date = new Date()
  date.setDate(date.getDate() - 90)
  return toDatetimeLocalValue(date)
}

/** Resolves SharedFilters' from/to to the ISO range actually sent to the
 * API — falling back to the last 90 days (ending now) whenever either side
 * is unset, instead of omitting the param and relying on the backend's own
 * (much narrower) last-24h default. */
export function resolveDateRange(filters: Pick<SharedFilters, 'from' | 'to'>): { from: string; to: string } {
  return {
    from: toIso(filters.from) || toIso(defaultRangeFrom())!,
    to: toIso(filters.to) || toIso(defaultRangeTo())!,
  }
}

/** Shared top-of-page filter bar — the three data-fetching pages (Overview,
 * Failure Explorer, Health) all slice by the same set of fields. Kept in the
 * URL query string (see useMonitoringFilters below) so switching between
 * these pages via MonitoringSubNav doesn't reset them. */
export interface SharedFilters {
  from: string
  to: string
  tenantId: string
  erpSystem: string
  documentType: string
  failureCategory: string
}

export const EMPTY_FILTERS: SharedFilters = {
  from: '',
  to: '',
  tenantId: '',
  erpSystem: '',
  documentType: 'all',
  failureCategory: 'all',
}

/** Reads/writes SharedFilters to the current page's query string. Each
 * monitoring sub-page calls this independently; since the query param names
 * are the same everywhere, navigating between sub-pages via MonitoringSubNav
 * (which forwards the current query string) carries the filters forward. */
export function useMonitoringFilters(): [SharedFilters, (next: SharedFilters) => void] {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()

  // Memoized on the query string itself, not recreated on every render —
  // callers depend on `filters` by reference (useCallback/useEffect), and an
  // object literal rebuilt every render defeats that, causing fetch effects
  // to re-fire every render in a loop instead of only when filters actually change.
  const filters: SharedFilters = useMemo(() => ({
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    tenantId: searchParams.get('tenantId') || '',
    erpSystem: searchParams.get('erpSystem') || '',
    documentType: searchParams.get('documentType') || 'all',
    failureCategory: searchParams.get('failureCategory') || 'all',
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [query])

  const setFilters = (next: SharedFilters) => {
    const params = new URLSearchParams()
    Object.entries(next).forEach(([key, value]) => {
      if (value && value !== 'all') params.set(key, value)
    })
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  return [filters, setFilters]
}

/** How many of SharedFilters' fields are actually set — drives the badge
 * count on the FilterPopover trigger. 'all' and '' are the unset states. */
export function countActiveFilters(filters: SharedFilters, { includeFailureCategory = true } = {}): number {
  let count = 0
  if (filters.from) count++
  if (filters.to) count++
  if (filters.tenantId) count++
  if (filters.erpSystem) count++
  if (filters.documentType !== 'all') count++
  if (includeFailureCategory && filters.failureCategory !== 'all') count++
  return count
}

export function FilterBar({
  filters,
  onChange,
  showFailureCategory = true,
}: {
  filters: SharedFilters
  onChange: (next: SharedFilters) => void
  showFailureCategory?: boolean
}) {
  const activeCount = countActiveFilters(filters, { includeFailureCategory: showFailureCategory })
  // Default (includeAll: false) already restricts to active ERPs.
  const { erpOptions, isLoading: erpsLoading } = useSupportedErps()
  // Computed once per mount, not on every render, so "now" doesn't drift
  // while the popover is open.
  const [defaultRange] = useState(() => ({ from: defaultRangeFrom(), to: defaultRangeTo() }))

  return (
    <FilterPopover
      activeCount={activeCount}
      onClear={() => onChange(
        showFailureCategory ? EMPTY_FILTERS : { ...EMPTY_FILTERS, failureCategory: filters.failureCategory }
      )}
      align="end"
      contentClassName="w-[min(92vw,460px)]"
    >
      <p className="text-xs text-muted-foreground -mt-1">
        Defaults to the last 90 days, ending today. Custom ranges are capped at 90 days.
      </p>
      {/* From/To each get a full-width row — a 2-up grid column is too
          narrow for the rendered "MM/DD/YYYY HH:MM AM" text plus the
          browser's native calendar-picker icon, which clipped the icon. */}
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">From</Label>
          <Input
            type="datetime-local"
            className="[&::-webkit-calendar-picker-indicator]:ml-1"
            value={filters.from || defaultRange.from}
            onChange={(e) => onChange({ ...filters, from: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">To</Label>
          <Input
            type="datetime-local"
            className="[&::-webkit-calendar-picker-indicator]:ml-1"
            value={filters.to || defaultRange.to}
            onChange={(e) => onChange({ ...filters, to: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Tenant</Label>
          <TenantCombobox
            value={filters.tenantId}
            onChange={(tenantId) => onChange({ ...filters, tenantId })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">ERP system</Label>
          <Select
            value={filters.erpSystem || 'all'}
            onValueChange={(v) => onChange({ ...filters, erpSystem: v === 'all' ? '' : v })}
            disabled={erpsLoading}
          >
            <SelectTrigger><SelectValue placeholder={erpsLoading ? 'Loading…' : undefined} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ERP systems</SelectItem>
              {erpOptions.map((erp) => (
                <SelectItem key={erp} value={erp}>{formatErpName(erp)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Document type</Label>
          <Select value={filters.documentType} onValueChange={(v) => onChange({ ...filters, documentType: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All document types</SelectItem>
              {DOCUMENT_TYPE_OPTIONS.map(([code, label]) => (
                <SelectItem key={code} value={code}>{label} ({code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showFailureCategory && (
          <div className="space-y-1.5">
            <Label className="text-xs">Failure category</Label>
            <Select value={filters.failureCategory} onValueChange={(v) => onChange({ ...filters, failureCategory: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {FAILURE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </FilterPopover>
  )
}

export function FunnelTiles({ funnel, note }: { funnel: MonitoringFunnel; note?: string }) {
  // `succeeded` is a newer field the backend may not have shipped yet on
  // every environment — default to 0 instead of crashing on `undefined`.
  const succeeded = funnel.succeeded ?? 0
  const failedShare = funnel.transmitted > 0 ? funnel.failed / funnel.transmitted : 0
  const succeededShare = funnel.transmitted > 0 ? succeeded / funnel.transmitted : 0
  const tiles: { label: string; value: number; hint?: string }[] = [
    { label: 'Transmitted', value: funnel.transmitted },
    { label: 'Validated', value: funnel.validated },
    { label: 'Rectified', value: funnel.rectified },
    { label: 'Retries', value: funnel.retries },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-4">
          <p className="text-xs text-success/80 flex items-center gap-1 font-medium">
            Succeeded
            <DataCoverageNote text="An invoice counts as succeeded once workflowState.delivered is true and it is not currently failed — the last required stage of the outbound chain." />
          </p>
          <p className="text-2xl font-semibold font-mono mt-1 text-success">{succeeded.toLocaleString()}</p>
          {funnel.transmitted > 0 && (
            <p className="text-xs text-success/70 mt-0.5">{formatPercent(succeededShare)} of transmitted</p>
          )}
        </CardContent>
      </Card>
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-4">
          <p className="text-xs text-destructive/80 flex items-center gap-1 font-medium">
            Failed (open)
            <DataCoverageNote text="Current count of all open failures, regardless of the date range selected above — unlike the other tiles, this isn't limited to that period." />
          </p>
          <p className="text-2xl font-semibold font-mono mt-1 text-destructive">{funnel.failed.toLocaleString()}</p>
          {funnel.transmitted > 0 && (
            <p className="text-xs text-destructive/70 mt-0.5">{formatPercent(failedShare)} of transmitted</p>
          )}
        </CardContent>
      </Card>
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {tile.label}
              {tile.hint && <DataCoverageNote text={tile.hint} />}
            </p>
            <p className="text-2xl font-semibold font-mono mt-1">{tile.value.toLocaleString()}</p>
          </CardContent>
        </Card>
      ))}
      {note && (
        <p className="col-span-full text-xs text-muted-foreground">{note}</p>
      )}
    </div>
  )
}

/** Skeleton matching FunnelTiles' layout — reusable anywhere FunnelTiles is
 * (Overview and Company drill-down both show it while their initial fetch
 * is in flight). */
export function FunnelTilesSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-14" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/** Skeleton for a single Card with a title and a block of content — the
 * generic shape behind ChartCardSkeleton/BreakdownCardSkeleton below, and
 * reusable for any other "Card with a heading + a body" loading state. */
export function CardSkeleton({ titleWidth = 'w-32', minHeight = PANEL_MIN_HEIGHT }: { titleWidth?: string; minHeight?: string }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className={cn('h-4', titleWidth)} />
      </CardHeader>
      <CardContent className={cn('flex items-end gap-2', minHeight)}>
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: `${30 + ((i * 37) % 70)}%` }}
          />
        ))}
      </CardContent>
    </Card>
  )
}

/** Skeleton for the tabbed breakdown card — tab-bar shape plus a handful of
 * row-shaped skeletons at the same min-height as the real tab panels, so the
 * card doesn't resize once data arrives. */
export function BreakdownCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-0">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <div className="flex gap-1 p-1 bg-muted rounded-md w-fit mb-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-24 rounded-sm" />
          ))}
        </div>
        <div className="space-y-3 overflow-hidden min-h-[120px] max-h-[280px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-10" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Composed skeleton for the Overview page's initial load — mirrors the
 * real page's section order (funnel tiles, trend chart, breakdown card) so
 * the loading state previews the actual layout instead of a generic spinner. */
export function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <FunnelTilesSkeleton />
      <CardSkeleton titleWidth="w-24" />
      <BreakdownCardSkeleton />
    </div>
  )
}

/** Skeleton for a Card of label/value rows (webhook delivery, processing
 * backlog on the Health page, etc.) — reusable wherever a card just shows a
 * short list of stats rather than a chart or a table. */
export function KeyValueCardSkeleton({ titleWidth = 'w-36', rows = 3 }: { titleWidth?: string; rows?: number }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <Skeleton className={cn('h-4', titleWidth)} />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-14" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/** Skeleton for a Card wrapping a data table — header bar plus a few
 * uniform rows, reusable for any table-shaped card. */
export function TableCardSkeleton({ titleWidth = 'w-40', columns = 5, rows = 4 }: { titleWidth?: string; columns?: number; rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className={cn('h-4', titleWidth)} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/** Composed skeleton for the Health page's initial load. */
export function HealthSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <KeyValueCardSkeleton titleWidth="w-32" />
        <KeyValueCardSkeleton titleWidth="w-40" />
      </div>
      <TableCardSkeleton titleWidth="w-36" columns={7} />
      <TableCardSkeleton titleWidth="w-28" columns={7} />
    </div>
  )
}

/** Composed skeleton for the Company drill-down's tenant view — mirrors the
 * real page's section order (tenant header, funnel tiles, two-up cards,
 * mapping coverage grid) while a looked-up tenant's data is in flight. */
export function CompanySkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-24 ml-auto" />
        </CardContent>
      </Card>
      <FunnelTilesSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CardSkeleton titleWidth="w-32" minHeight="min-h-[180px]" />
        <CardSkeleton titleWidth="w-24" minHeight="min-h-[180px]" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

/** Only occupies space when there's something to say — unlike a permanently
 * visible "Alerts" card, this renders nothing while clean so it doesn't push
 * the rest of the page down on every load. */
export function AlertsStrip({ alerts }: { alerts: MonitoringAlert[]; isLoading: boolean }) {
  if (alerts.length === 0) return null
  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div
          key={`${alert.key}-${alert.tenantId ?? i}`}
          className={cn(
            'flex items-start gap-3 p-3 rounded-lg border text-sm',
            alert.severity === 'critical'
              ? 'bg-destructive/10 border-destructive/20 text-destructive'
              : 'bg-warning/10 border-warning/20 text-warning'
          )}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">{alert.message}</p>
            <p className="text-xs opacity-80">
              Observed {alert.observedValue} vs. threshold {alert.threshold}
              {alert.tenantId && ` · Tenant ${alert.tenantId}`}
            </p>
          </div>
          <Badge variant="secondary" className="capitalize shrink-0">{alert.severity}</Badge>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Evaluation only — these conditions are checked on a 5-minute poll in this dashboard and are not delivered to Slack/email.
      </p>
    </div>
  )
}

/** Kept for any caller that still wants the full loading/empty/list banner
 * (e.g. embedded in a dedicated "Alerts" section elsewhere). */
export function AlertsBanner({ alerts, isLoading }: { alerts: MonitoringAlert[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Checking alert conditions...
      </div>
    )
  }
  if (alerts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No alert conditions are currently triggered.</p>
    )
  }
  return <AlertsStrip alerts={alerts} isLoading={false} />
}

const TREND_SERIES = [
  { key: 'transmitted' as const, label: 'Transmitted', color: 'hsl(var(--primary))' },
  { key: 'validated' as const, label: 'Validated', color: 'hsl(var(--warning))' },
  { key: 'succeeded' as const, label: 'Succeeded', color: 'hsl(var(--success))' },
  { key: 'failed' as const, label: 'Failed', color: 'hsl(var(--destructive))' },
]

/** Lightweight inline SVG line chart for the overview's daily trend — no
 * charting library pulled in for four lines and a hover tooltip. */
export function DailyTrendChart({
  data: rawData,
}: {
  data: Array<{ date: string; transmitted: number; validated: number; failed: number; succeeded?: number }>
}) {
  // `succeeded` is a newer field the backend may not have shipped yet on
  // every environment — normalize to 0 once here instead of crashing (or
  // silently NaN-ing the chart math) on `undefined` at every usage below.
  const data = useMemo(() => rawData.map((d) => ({ ...d, succeeded: d.succeeded ?? 0 })), [rawData])
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const width = 720
  const height = 280
  const padding = { top: 12, right: 12, bottom: 28, left: 40 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  const maxValue = useMemo(
    () => Math.max(1, ...data.flatMap((d) => [d.transmitted, d.validated, d.failed, d.succeeded])),
    [data]
  )

  if (data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center', PANEL_MIN_HEIGHT)}>
        <EmptyState
          icon={LineChart}
          title="No trend data in this period"
          description="Transmitted, validated and failed counts will chart here once invoices move through this range."
          compact
        />
      </div>
    )
  }

  const xFor = (i: number) => padding.left + (data.length === 1 ? plotWidth / 2 : (i / (data.length - 1)) * plotWidth)
  const yFor = (v: number) => padding.top + plotHeight - (v / maxValue) * plotHeight

  const pathFor = (key: 'transmitted' | 'validated' | 'failed' | 'succeeded') =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d[key]).toFixed(1)}`).join(' ')

  // Only label a handful of x-axis ticks so dense ranges don't overlap.
  const tickStep = Math.max(1, Math.ceil(data.length / 6))

  const handleMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * width
    const ratio = (relX - padding.left) / plotWidth
    const i = Math.round(ratio * (data.length - 1))
    setHoverIndex(Math.min(data.length - 1, Math.max(0, i)))
  }

  const hovered = hoverIndex !== null ? data[hoverIndex] : null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {TREND_SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[480px]"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
          role="img"
          aria-label="Daily transmitted, validated and failed invoice counts"
        >
          {/* Horizontal gridlines at even value steps, each labeled on the
              y-axis — a bare top/bottom label left the middle of the chart
              unreadable at a glance. */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={padding.left}
              x2={width - padding.right}
              y1={padding.top + plotHeight * (1 - t)}
              y2={padding.top + plotHeight * (1 - t)}
              stroke="hsl(var(--border))"
              strokeWidth={1}
            />
          ))}
          {/* Vertical gridlines at each labeled x-axis tick, so a point can be
              read against both axes rather than just the x-axis ticks alone. */}
          {data.map((d, i) =>
            i % tickStep === 0 ? (
              <line
                key={`grid-${d.date}`}
                x1={xFor(i)}
                x2={xFor(i)}
                y1={padding.top}
                y2={padding.top + plotHeight}
                stroke="hsl(var(--border))"
                strokeWidth={1}
                strokeDasharray="2 3"
                opacity={0.5}
              />
            ) : null
          )}
          {data.map((d, i) =>
            i % tickStep === 0 ? (
              <text
                key={d.date}
                x={xFor(i)}
                y={height - 8}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={10}
              >
                {format(new Date(d.date), 'MMM d')}
              </text>
            ) : null
          )}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <text
              key={`label-${t}`}
              x={padding.left - 8}
              y={padding.top + plotHeight * (1 - t) + 3}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize={10}
            >
              {Math.round(maxValue * t).toLocaleString()}
            </text>
          ))}
          {TREND_SERIES.map((s) => (
            <path key={s.key} d={pathFor(s.key)} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {hoverIndex !== null && (
            <line
              x1={xFor(hoverIndex)}
              x2={xFor(hoverIndex)}
              y1={padding.top}
              y2={padding.top + plotHeight}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}
          {hoverIndex !== null &&
            TREND_SERIES.map((s) => (
              <circle
                key={s.key}
                cx={xFor(hoverIndex)}
                cy={yFor(data[hoverIndex][s.key])}
                r={3.5}
                fill={s.color}
                stroke="hsl(var(--background))"
                strokeWidth={1.5}
              />
            ))}
        </svg>
        {hovered && (
          <div className="pointer-events-none absolute top-0 right-0 bg-popover border rounded-md shadow-sm px-3 py-2 text-xs space-y-1">
            <p className="font-medium">{formatDate(hovered.date).split(' ').slice(0, 3).join(' ')}</p>
            {TREND_SERIES.map((s) => (
              <p key={s.key} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                {s.label}: <span className="font-mono">{hovered[s.key].toLocaleString()}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const SUCCESS_STAGE_LABELS: Record<string, string> = {
  delivered: 'Delivered (success)',
  transmitted: 'Transmitted',
  signed: 'Signed',
  validated: 'Validated',
  transformed: 'Transformed',
  not_started: 'Not started',
}

/** Renders a `MonitoringSuccessStageRow[]` list — shared between the
 * overview's Breakdown tab and the Company drill-down's own success-stage
 * card, so the two never drift in how they label/order stages. */
export function SuccessStageList({ stages }: { stages: MonitoringSuccessStageRow[] | undefined }) {
  // The backend may not have shipped this field yet on every environment —
  // render the empty state instead of crashing on `undefined`.
  stages = stages ?? []
  if (stages.length === 0) {
    return (
      <div className="py-8 flex items-center justify-center min-h-[120px]">
        <EmptyState
          icon={CheckCircle2}
          title="No successes in this period"
          description="Invoices that reach a workflow stage in the selected range will appear here."
          compact
        />
      </div>
    )
  }
  return (
    <div className={cn(BREAKDOWN_LIST_HEIGHT, 'space-y-2 pr-1')}>
      <div className="flex items-center justify-between text-xs font-semibold text-foreground px-0.5">
        <span>Stage</span>
        <span>Count</span>
      </div>
      {stages.map((row) => (
        <div key={row.stage} className="flex items-center justify-between text-sm py-1 border-b last:border-b-0">
          <span className="flex items-center gap-1.5">
            {SUCCESS_STAGE_LABELS[row.stage] ?? row.stage}
            {row.terminal && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Terminal</Badge>}
          </span>
          <span className="font-mono font-semibold text-success">{row.count}</span>
        </div>
      ))}
    </div>
  )
}

/** The overview's small breakdown cards (failure reasons, success stages,
 * document types, tenant leaderboard, retries) merged into one tabbed card —
 * same data, one view at a time instead of several fighting for attention
 * at once. */
export function BreakdownCard({
  data,
  onViewTenant,
}: {
  data: Pick<MonitoringOverview, 'topFailureReasons' | 'topSuccessStages' | 'documentTypes' | 'tenantLeaderboard' | 'retries'>
  onViewTenant: (tenantId: string) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="reasons">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="reasons">Failure reasons</TabsTrigger>
            <TabsTrigger value="successStages">Success stages</TabsTrigger>
            <TabsTrigger value="docTypes">Document types</TabsTrigger>
            <TabsTrigger value="leaderboard">Tenant leaderboard</TabsTrigger>
            <TabsTrigger value="retries">Retries</TabsTrigger>
          </TabsList>

          <TabsContent value="reasons">
            <p className="text-xs text-muted-foreground mb-2">
              Why invoices in this period failed, grouped by failure category.
            </p>
            {data.topFailureReasons.length === 0 ? (
              <div className="py-8 flex items-center justify-center min-h-[120px]">
                <EmptyState
                  icon={CheckCircle2}
                  title="No failures in this period"
                  description="Every invoice in the selected range was processed without an error."
                  compact
                />
              </div>
            ) : (
              <div className={cn(BREAKDOWN_LIST_HEIGHT, 'space-y-2 pr-1')}>
                <div className="flex items-center justify-between text-xs font-semibold text-foreground px-0.5">
                  <span>Category</span>
                  <span>Count</span>
                </div>
                {data.topFailureReasons.map((reason) => (
                  <div key={reason.category} className="flex items-center justify-between text-sm py-1 border-b last:border-b-0">
                    <span className="capitalize">{reason.category.replace(/_/g, ' ')}</span>
                    <span className="font-mono font-semibold text-destructive">{reason.count}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="successStages">
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
              The furthest workflow stage non-failed invoices in this period reached.
              <DataCoverageNote text="Only 'Delivered' is terminal; the rest are still in flight, not successes. Failed invoices are excluded, so this never double-counts against the failure breakdown." />
            </p>
            <SuccessStageList stages={data.topSuccessStages} />
          </TabsContent>

          <TabsContent value="docTypes">
            <p className="text-xs text-muted-foreground mb-2">
              Invoice volume in this period, grouped by NRS document type.
            </p>
            {data.documentTypes.length === 0 ? (
              <div className="py-8 flex items-center justify-center min-h-[120px]">
                <EmptyState
                  icon={Inbox}
                  title="No documents in this period"
                  description="Document-type volume will appear here once invoices come through."
                  compact
                />
              </div>
            ) : (
              <div className={cn(BREAKDOWN_LIST_HEIGHT, 'space-y-2 pr-1')}>
                <div className="flex items-center justify-between text-xs font-semibold text-foreground px-0.5">
                  <span>Document type</span>
                  <span>Count</span>
                </div>
                {data.documentTypes.map((dt) => (
                  <div key={dt.documentType} className="flex items-center justify-between text-sm py-1 border-b last:border-b-0">
                    <span>
                      {NRS_DOCUMENT_TYPE_LABELS[dt.documentType as NrsDocumentTypeCode] ?? dt.documentType}
                      <span className="text-muted-foreground font-mono text-xs ml-1">({dt.documentType})</span>
                    </span>
                    <span className="font-mono font-semibold">{dt.count}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="leaderboard">
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
              Top 20 tenants by current open failures. Click a row to drill in.
              <DataCoverageNote text="Current open failures per tenant — not scoped to the date range above." />
            </p>
            {data.tenantLeaderboard.length === 0 ? (
              <div className="py-8 flex items-center justify-center min-h-[120px]">
                <EmptyState
                  icon={CheckCircle2}
                  title="No open failures right now"
                  description="Every tenant is currently clear — this list fills in as failures occur."
                  compact
                />
              </div>
            ) : (
              <div className={cn(BREAKDOWN_LIST_HEIGHT, 'space-y-1 pr-1')}>
                <div className="flex items-center justify-between text-xs font-semibold text-foreground px-2.5">
                  <span>Tenant</span>
                  <span>Open failures</span>
                </div>
                {data.tenantLeaderboard.map((row) => (
                  <button
                    key={row.tenantId}
                    onClick={() => onViewTenant(row.tenantId)}
                    className="w-full flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50 transition-colors text-left"
                  >
                    <span className="font-mono truncate">{row.tenantId}</span>
                    <Badge variant="secondary">{row.openFailures}</Badge>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="retries">
            <p className="text-xs text-muted-foreground mb-2">
              How many retry attempts this period's invoices and webhook deliveries needed.
            </p>
            <div className="space-y-2 text-sm min-h-[120px]">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground px-0.5">
                <span>Retry type</span>
                <span>Count</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b">
                <span>Invoice validation retries</span>
                <span className="font-mono font-semibold">{data.retries.invoiceValidationAttempts}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Webhook delivery retries</span>
                <span className="font-mono font-semibold">{data.retries.webhookDeliveryRetries}</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

/** Renders a page's `dataCoverage` map (backend-authored caveats per metric,
 * e.g. "rectified: legacy resolution history is incomplete") as a labeled
 * list instead of one run-on " · "-joined sentence — each entry gets its own
 * line so the key and caveat are easy to tell apart and scan. */
export function DataCoverageFooter({ coverage }: { coverage: Record<string, string> }) {
  const entries = Object.entries(coverage)
  if (entries.length === 0) return null
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-base font-medium text-foreground mb-2">Data Coverage Notes</p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {entries.map(([key, value]) => (
          <div key={key} className="flex gap-1.5 text-xs text-muted-foreground min-w-0">
            <dt className="shrink-0 font-medium text-foreground capitalize">{key}:</dt>
            <dd className="min-w-0">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

const SUB_NAV_ITEMS = [
  { href: '/admin/monitoring/overview', label: 'Overview' },
  { href: '/admin/monitoring/company', label: 'Company drill-down' },
  { href: '/admin/monitoring/failures', label: 'Failure explorer' },
  { href: '/admin/monitoring/health', label: 'Health' },
]

/** Sub-page nav for Monitoring, rendered like tabs but backed by real routes
 * — each is its own URL under /admin/monitoring/*, and switching between
 * them forwards the current query string so SharedFilters survive the
 * navigation (see useMonitoringFilters). */
export function MonitoringSubNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()

  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
      {SUB_NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={query ? `${item.href}?${query}` : item.href}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              isActive ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
