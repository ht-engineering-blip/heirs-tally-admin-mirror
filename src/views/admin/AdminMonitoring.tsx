'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Column, DataTable } from '@/components/shared/DataTable'
import { SectionLoader } from '@/components/shared/SectionLoader'
import { DataCoverageNote } from '@/components/shared/DataCoverageNote'
import { createMonitoringApi } from '@/lib/api/monitoring-api'
import {
  NRS_DOCUMENT_TYPE_LABELS,
  type FailureCategory,
  type MonitoringAlert,
  type MonitoringCompany,
  type MonitoringFailureRow,
  type MonitoringFunnel,
  type MonitoringHealth,
  type MonitoringOverview,
  type NrsDocumentTypeCode,
} from '@/types/monitoring'
import { AlertTriangle, ExternalLink, Loader2, Search } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const api = createMonitoringApi()

const FAILURE_CATEGORIES: { value: FailureCategory; label: string }[] = [
  { value: 'schema_validation', label: 'Schema validation' },
  { value: 'mapping_configuration', label: 'Mapping configuration' },
  { value: 'business_rule', label: 'Business rule' },
  { value: 'nrs_rejection', label: 'NRS rejection' },
  { value: 'transport_timeout', label: 'Transport / timeout' },
  { value: 'auth_credential', label: 'Auth / credential' },
  { value: 'unknown', label: 'Unknown' },
]

const DOCUMENT_TYPE_OPTIONS = Object.entries(NRS_DOCUMENT_TYPE_LABELS) as [NrsDocumentTypeCode, string][]

const FAILURE_PAGE_SIZE = 20

function formatSeconds(value: number | null): string {
  if (value === null) return '—'
  return `${value.toFixed(2)}s`
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return format(new Date(value), 'MMM d, yyyy HH:mm')
  } catch {
    return value
  }
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(0)}s`
  const minutes = seconds / 60
  if (minutes < 60) return `${minutes.toFixed(0)}m`
  return `${(minutes / 60).toFixed(1)}h`
}

/** Shared top-of-tab filter bar — the three data-fetching tabs (Overview,
 * Failure Explorer, Health) all slice by the same set of fields. */
interface SharedFilters {
  from: string
  to: string
  tenantId: string
  erpSystem: string
  documentType: string
  failureCategory: string
}

const EMPTY_FILTERS: SharedFilters = {
  from: '',
  to: '',
  tenantId: '',
  erpSystem: '',
  documentType: 'all',
  failureCategory: 'all',
}

function FilterBar({
  filters,
  onChange,
  showFailureCategory = true,
}: {
  filters: SharedFilters
  onChange: (next: SharedFilters) => void
  showFailureCategory?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Filters</CardTitle>
        <CardDescription>Defaults to the last 24 hours. Custom ranges are capped at 90 days.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">From</Label>
          <Input
            type="datetime-local"
            value={filters.from}
            onChange={(e) => onChange({ ...filters, from: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">To</Label>
          <Input
            type="datetime-local"
            value={filters.to}
            onChange={(e) => onChange({ ...filters, to: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tenant ID</Label>
          <Input
            placeholder="e.g. BIZ_1234567890"
            value={filters.tenantId}
            onChange={(e) => onChange({ ...filters, tenantId: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">ERP system</Label>
          <Input
            placeholder="e.g. SAP"
            value={filters.erpSystem}
            onChange={(e) => onChange({ ...filters, erpSystem: e.target.value })}
          />
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
      </CardContent>
    </Card>
  )
}

function toIso(localDateTime: string): string | undefined {
  if (!localDateTime) return undefined
  const date = new Date(localDateTime)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function FunnelTiles({ funnel, note }: { funnel: MonitoringFunnel; note?: string }) {
  const tiles: { label: string; value: number; hint?: string }[] = [
    { label: 'Transmitted', value: funnel.transmitted },
    { label: 'Validated', value: funnel.validated },
    { label: 'Failed (open)', value: funnel.failed, hint: 'Live gauge — not period-scoped' },
    { label: 'Rectified', value: funnel.rectified },
    { label: 'Retries', value: funnel.retries },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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

function AlertsBanner({ alerts, isLoading }: { alerts: MonitoringAlert[]; isLoading: boolean }) {
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

function OverviewTab({
  filters,
  onViewTenant,
}: {
  filters: SharedFilters
  onViewTenant: (tenantId: string) => void
}) {
  const [data, setData] = useState<MonitoringOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([])
  const [alertsLoading, setAlertsLoading] = useState(true)
  const isFirstFetch = useRef(true)

  const fetchOverview = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.getOverview({
        from: toIso(filters.from),
        to: toIso(filters.to),
        tenantId: filters.tenantId || undefined,
        erpSystem: filters.erpSystem || undefined,
        documentType: filters.documentType !== 'all' ? filters.documentType : undefined,
        failureCategory: filters.failureCategory !== 'all' ? (filters.failureCategory as FailureCategory) : undefined,
      })
      setData(res.data)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load monitoring overview')
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true)
    try {
      const res = await api.getAlerts()
      setAlerts(res.data.alerts)
    } catch {
      // Alerts are supplementary — a failed poll shouldn't block the rest of the dashboard.
    } finally {
      setAlertsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isFirstFetch.current) {
      isFirstFetch.current = false
      fetchOverview()
      return
    }
    const t = setTimeout(fetchOverview, 350)
    return () => clearTimeout(t)
  }, [fetchOverview])

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  if (isLoading && !data) {
    return <SectionLoader message="Loading overview" />
  }
  if (!data) return null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alerts</CardTitle>
          <CardDescription>Pull-based condition checks, polled every 5 minutes.</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertsBanner alerts={alerts} isLoading={alertsLoading} />
        </CardContent>
      </Card>

      <FunnelTiles funnel={data.funnel} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top failure reasons</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topFailureReasons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No failures in this period.</p>
            ) : (
              <div className="space-y-2">
                {data.topFailureReasons.map((reason) => (
                  <div key={reason.category} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{reason.category.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-muted-foreground">{reason.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1.5">
              Tenant leaderboard
              <DataCoverageNote text="Current open failures per tenant — not scoped to the date range above." />
            </CardTitle>
            <CardDescription>Top 20 tenants by current open failures. Click a row to drill in.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.tenantLeaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open failures right now.</p>
            ) : (
              <div className="space-y-1">
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
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document types</CardTitle>
          </CardHeader>
          <CardContent>
            {data.documentTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents in this period.</p>
            ) : (
              <div className="space-y-2">
                {data.documentTypes.map((dt) => (
                  <div key={dt.documentType} className="flex items-center justify-between text-sm">
                    <span>
                      {NRS_DOCUMENT_TYPE_LABELS[dt.documentType as NrsDocumentTypeCode] ?? dt.documentType}
                      <span className="text-muted-foreground font-mono text-xs ml-1">({dt.documentType})</span>
                    </span>
                    <span className="font-mono text-muted-foreground">{dt.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Retries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Invoice validation retries</span>
              <span className="font-mono text-muted-foreground">{data.retries.invoiceValidationAttempts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Webhook delivery retries</span>
              <span className="font-mono text-muted-foreground">{data.retries.webhookDeliveryRetries}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily trend</CardTitle>
        </CardHeader>
        <CardContent>
          {data.dailyTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Transmitted</th>
                    <th className="py-2 pr-4">Validated</th>
                    <th className="py-2 pr-4">Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dailyTrend.map((day) => (
                    <tr key={day.date} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{day.date}</td>
                      <td className="py-2 pr-4">{day.transmitted}</td>
                      <td className="py-2 pr-4">{day.validated}</td>
                      <td className="py-2 pr-4">{day.failed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {Object.entries(data.dataCoverage).map(([key, value]) => `${key}: ${value}`).join(' · ')}
      </p>
    </div>
  )
}

function CompanyTab({ tenantId, onTenantIdChange }: { tenantId: string; onTenantIdChange: (id: string) => void }) {
  const [inputValue, setInputValue] = useState(tenantId)
  const [data, setData] = useState<MonitoringCompany | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState({ from: '', to: '', erpSystem: '', documentType: 'all' })

  useEffect(() => { setInputValue(tenantId) }, [tenantId])

  const fetchCompany = useCallback(async (id: string) => {
    if (!id) return
    setIsLoading(true)
    try {
      const res = await api.getCompany(id, {
        from: toIso(filters.from),
        to: toIso(filters.to),
        erpSystem: filters.erpSystem || undefined,
        documentType: filters.documentType !== 'all' ? filters.documentType : undefined,
      })
      setData(res.data)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load this tenant')
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    if (tenantId) fetchCompany(tenantId)
  }, [tenantId, fetchCompany])

  const SOURCE_BADGE: Record<string, string> = {
    tenant: 'bg-success/10 text-success',
    default: 'bg-primary/10 text-primary',
    missing: 'bg-muted text-muted-foreground',
  }
  const SOURCE_LABEL: Record<string, string> = {
    tenant: 'Tenant mapping',
    default: 'Platform default',
    missing: 'Not configured',
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Look up a tenant</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tenant ID, e.g. BIZ_1234567890"
              className="pl-10"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onTenantIdChange(inputValue) }}
            />
          </div>
          <Button onClick={() => onTenantIdChange(inputValue)} disabled={!inputValue}>
            Look up
          </Button>
        </CardContent>
      </Card>

      {isLoading && <SectionLoader message="Loading tenant" size="sm" />}

      {!isLoading && !data && tenantId && (
        <p className="text-sm text-muted-foreground">No data found for this tenant.</p>
      )}

      {!isLoading && data && (
        <>
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center gap-4">
              <div>
                <p className="font-medium">{data.company.businessName}</p>
                <p className="text-xs text-muted-foreground font-mono">{data.company.tenantId}</p>
              </div>
              <Badge variant="secondary" className="capitalize">{data.company.status}</Badge>
              {data.company.erpSystem && <Badge variant="outline">{data.company.erpSystem}</Badge>}
              <span className="text-xs text-muted-foreground ml-auto">
                Onboarded {formatDate(data.company.createdAt)}
              </span>
            </CardContent>
          </Card>

          <FunnelTiles funnel={data.funnel} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Failure reasons</CardTitle>
              </CardHeader>
              <CardContent>
                {data.failureReasons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No failures in this period.</p>
                ) : (
                  <div className="space-y-2">
                    {data.failureReasons.map((reason) => (
                      <div key={reason.category} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{reason.category.replace(/_/g, ' ')}</span>
                        <span className="font-mono text-muted-foreground">{reason.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Onboarding</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>First transmitted</span>
                  <span className="text-muted-foreground">{formatDate(data.onboardingToFirstSuccess.firstTransmittedAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>First success</span>
                  <span className="text-muted-foreground">{formatDate(data.onboardingToFirstSuccess.firstSuccessAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Time to first success</span>
                  <span className="text-muted-foreground">{formatDuration(data.onboardingToFirstSuccess.timeToFirstSuccessMilliseconds)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    Time to resolution
                    <DataCoverageNote text={data.timeToResolution.reason} />
                  </span>
                  <span className="text-muted-foreground">N/A</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mapping coverage by document type</CardTitle>
              <CardDescription>Which document types this tenant has a saved or default mapping for.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.documentTypeConfiguration.map((dt) => (
                <div key={dt.documentType} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                  <span>{dt.documentType.replace(/_/g, ' ')}</span>
                  <Badge className={cn('text-xs', SOURCE_BADGE[dt.source])}>{SOURCE_LABEL[dt.source]}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

type FailureRow = MonitoringFailureRow & { id: string }

function FailuresTab({ filters }: { filters: SharedFilters }) {
  const [rows, setRows] = useState<FailureRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const isFirstFetch = useRef(true)

  const fetchFailures = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.getFailures({
        from: toIso(filters.from),
        to: toIso(filters.to),
        tenantId: filters.tenantId || undefined,
        erpSystem: filters.erpSystem || undefined,
        documentType: filters.documentType !== 'all' ? filters.documentType : undefined,
        failureCategory: filters.failureCategory !== 'all' ? (filters.failureCategory as FailureCategory) : undefined,
        page,
        limit: FAILURE_PAGE_SIZE,
      })
      setRows(res.data.map((row) => ({ ...row, id: row.irn })))
      setTotal(res.meta.total)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load failures')
    } finally {
      setIsLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    if (isFirstFetch.current) {
      isFirstFetch.current = false
      fetchFailures()
      return
    }
    const t = setTimeout(fetchFailures, 350)
    return () => clearTimeout(t)
  }, [fetchFailures])

  useEffect(() => { setPage(1) }, [filters])

  const columns: Column<FailureRow>[] = [
    {
      key: 'irn',
      header: 'Invoice',
      accessor: (row) => (
        <div className="text-sm">
          <p className="font-mono text-xs truncate max-w-[160px]">{row.irn}</p>
          {row.invoiceNumber && <p className="text-xs text-muted-foreground">{row.invoiceNumber}</p>}
        </div>
      ),
    },
    {
      key: 'tenantId',
      header: 'Tenant',
      accessor: (row) => <span className="font-mono text-xs">{row.tenantId}</span>,
    },
    {
      key: 'erpSystem',
      header: 'ERP',
      accessor: (row) => row.erpSystem,
    },
    {
      key: 'documentType',
      header: 'Document type',
      accessor: (row) => row.documentType
        ? (NRS_DOCUMENT_TYPE_LABELS[row.documentType as NrsDocumentTypeCode] ?? row.documentType)
        : '—',
    },
    {
      key: 'failureCategory',
      header: 'Category',
      accessor: (row) => <span className="capitalize">{row.failureCategory.replace(/_/g, ' ')}</span>,
    },
    {
      key: 'reason',
      header: 'Reason',
      accessor: (row) => (
        <p className="text-sm text-muted-foreground truncate max-w-[220px]" title={row.reason}>
          {row.reason || '—'}
        </p>
      ),
    },
    {
      key: 'retryCount',
      header: 'Retries',
      accessor: (row) => row.retryCount,
    },
    {
      key: 'resolutionStatus',
      header: 'Status',
      accessor: (row) => (
        <Badge className={row.resolutionStatus === 'rectified' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
          {row.resolutionStatus}
        </Badge>
      ),
    },
    {
      key: 'timeToResolutionMilliseconds',
      header: 'TTR',
      accessor: (row) => formatDuration(row.timeToResolutionMilliseconds),
    },
    {
      key: 'detailUrl',
      header: '',
      accessor: (row) => (
        <a
          href={row.detailUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      ),
    },
  ]

  return (
    <DataTable
      data={rows}
      columns={columns}
      isLoading={isLoading}
      currentPage={page}
      pageSize={FAILURE_PAGE_SIZE}
      totalItems={total}
      onPageChange={setPage}
      emptyMessage="No failures match these filters"
    />
  )
}

function HealthTab({ filters }: { filters: Pick<SharedFilters, 'from' | 'to' | 'tenantId'> }) {
  const [data, setData] = useState<MonitoringHealth | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isFirstFetch = useRef(true)

  const fetchHealth = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.getHealth({
        from: toIso(filters.from),
        to: toIso(filters.to),
        tenantId: filters.tenantId || undefined,
      })
      setData(res.data)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load system health')
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    if (isFirstFetch.current) {
      isFirstFetch.current = false
      fetchHealth()
      return
    }
    const t = setTimeout(fetchHealth, 350)
    return () => clearTimeout(t)
  }, [fetchHealth])

  if (isLoading && !data) {
    return <SectionLoader message="Loading health" />
  }
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <CardTitle className="text-base mb-3">Webhook delivery</CardTitle>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Delivered / total</span>
                <span className="font-mono text-muted-foreground">{data.webhooks.delivered} / {data.webhooks.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Success rate</span>
                <span className="font-mono text-muted-foreground">{formatPercent(data.webhooks.deliverySuccessRate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Retrying / failed</span>
                <span className="font-mono text-muted-foreground">{data.webhooks.retrying} / {data.webhooks.failed}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <CardTitle className="text-base mb-3 flex items-center gap-1.5">
              Processing backlog
              <DataCoverageNote text={data.dataCoverage.queueDepth} />
            </CardTitle>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Currently in-flight</span>
                <span className="font-mono text-muted-foreground">{data.backlog.processing}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Oldest in-flight since</span>
                <span className="text-muted-foreground">{formatDate(data.backlog.oldestInFlightAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  Retry effectiveness
                  <DataCoverageNote text={data.retryEffectiveness.reason} />
                </span>
                <span className="text-muted-foreground">N/A</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-1.5">
            API performance
            <DataCoverageNote text={data.dataCoverage.apiMetrics} />
          </CardTitle>
          <CardDescription>Single-instance counters — not aggregated across replicas if you run more than one.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.api.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API traffic in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 pr-4">Route</th>
                    <th className="py-2 pr-4">Requests</th>
                    <th className="py-2 pr-4">Error rate</th>
                    <th className="py-2 pr-4">4xx / 5xx</th>
                    <th className="py-2 pr-4">p50</th>
                    <th className="py-2 pr-4">p95</th>
                    <th className="py-2 pr-4">p99</th>
                  </tr>
                </thead>
                <tbody>
                  {data.api.map((route) => (
                    <tr key={route.route} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{route.route}</td>
                      <td className="py-2 pr-4">{route.requestCount}</td>
                      <td className="py-2 pr-4">{formatPercent(route.errorRate)}</td>
                      <td className="py-2 pr-4">{route.clientErrorCount} / {route.serverErrorCount}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{formatSeconds(route.p50Seconds)}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{formatSeconds(route.p95Seconds)}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{formatSeconds(route.p99Seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-1.5">
            Pipeline steps
            <DataCoverageNote text={data.dataCoverage.pipelineMetrics} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.pipeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pipeline activity in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 pr-4">Step</th>
                    <th className="py-2 pr-4">ERP</th>
                    <th className="py-2 pr-4">Success / fail</th>
                    <th className="py-2 pr-4">Failure rate</th>
                    <th className="py-2 pr-4">p50</th>
                    <th className="py-2 pr-4">p95</th>
                    <th className="py-2 pr-4">p99</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pipeline.map((step, i) => (
                    <tr key={`${step.step}-${step.erpSystem}-${i}`} className="border-b last:border-0">
                      <td className="py-2 pr-4">{step.step}</td>
                      <td className="py-2 pr-4">{step.erpSystem}</td>
                      <td className="py-2 pr-4">{step.successCount} / {step.failureCount}</td>
                      <td className="py-2 pr-4">{formatPercent(step.failureRate)}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{formatSeconds(step.p50Seconds)}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{formatSeconds(step.p95Seconds)}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{formatSeconds(step.p99Seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminMonitoring() {
  const [activeTab, setActiveTab] = useState('overview')
  const [filters, setFilters] = useState<SharedFilters>(EMPTY_FILTERS)
  const [companyTenantId, setCompanyTenantId] = useState('')

  const handleViewTenant = (tenantId: string) => {
    setCompanyTenantId(tenantId)
    setActiveTab('company')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Monitoring</h1>
          <p className="page-subtitle">NRS invoice processing health across tenants and ERPs</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="company">Company drill-down</TabsTrigger>
          <TabsTrigger value="failures">Failure explorer</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <FilterBar filters={filters} onChange={setFilters} />
          <OverviewTab filters={filters} onViewTenant={handleViewTenant} />
        </TabsContent>

        <TabsContent value="company" className="mt-4">
          <CompanyTab tenantId={companyTenantId} onTenantIdChange={setCompanyTenantId} />
        </TabsContent>

        <TabsContent value="failures" className="space-y-6 mt-4">
          <FilterBar filters={filters} onChange={setFilters} />
          <FailuresTab filters={filters} />
        </TabsContent>

        <TabsContent value="health" className="space-y-6 mt-4">
          <FilterBar filters={filters} onChange={setFilters} showFailureCategory={false} />
          <HealthTab filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
