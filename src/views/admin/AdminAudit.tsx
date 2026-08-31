'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Column, DataTable, JsonBlock, KeyValueTable } from '@/components/shared'
import { Loader2, ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface AuditActor {
  actorType: 'user' | 'system' | 'tenant' | 'api_key'
  actorId: string
  actorName?: string
  ipAddress?: string
  userAgent?: string
}

interface AuditResource {
  resourceType: string
  resourceId: string
  resourceName?: string
}

interface AuditLogEntry {
  id: string
  _id: string
  tenantId?: string
  eventId: string
  eventType: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  actor: AuditActor
  resource: AuditResource | string
  description: string
  changes?: { before?: any; after?: any }
  metadata: Record<string, any>
  requestId?: string
  requestMethod?: string
  requestPath?: string
  responseStatus?: number
  duration?: number
  error?: { message: string; code?: string; stack?: string }
  timestamp: string
  createdAt: string
  hash?: string
  previousHash?: string
}

interface VerifyDetail {
  eventId: string
  timestamp: string
  isCurrentValid: boolean
  isChainValid: boolean
  expectedHash: string
  actualHash?: string
  expectedPreviousHash: string
  actualPreviousHash?: string
}

const EVENT_TYPES = [
  'tenant.created', 'tenant.updated', 'tenant.activated', 'tenant.suspended', 'tenant.deleted',
  'invoice.submitted', 'invoice.transformed', 'invoice.validated', 'invoice.signed',
  'invoice.transmitted', 'invoice.delivered', 'invoice.failed', 'invoice.received',
  'invoice.acknowledged', 'invoice.downloaded', 'invoice.synced', 'invoice.paid', 'invoice.rejected',
  'api_key.created', 'api_key.used', 'api_key.revoked',
  'auth.login.success', 'auth.login.failed', 'auth.logout', 'auth.token.expired',
  'firs.api.call', 'firs.api.success', 'firs.api.error',
  'system.error', 'system.warning',
]

const RESOURCE_TYPES = ['tenant', 'api_key', 'invoice', 'system_config', 'onboarding', 'event_routing']

const SEVERITY_STYLES: Record<string, string> = {
  info: 'bg-muted text-muted-foreground',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-destructive/10 text-destructive',
  critical: 'bg-destructive text-destructive-foreground',
}

const PAGE_SIZE = 20

// admin.routes.ts is a generic pass-through proxy that attaches x-admin-key
// server-side regardless of the client request — credentials: 'include' is
// all that's needed here. Plain fetch (not Eden Treaty) since none of these
// routes exist in the generated server types yet.
async function auditFetch(path: string, params?: Record<string, any>) {
  const url = new URL(`${window.location.origin}/api/v1/admin${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
    })
  }
  const res = await fetch(url.toString(), { credentials: 'include' })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || 'Request failed')
  }
  return json
}

function getResource(log: AuditLogEntry): AuditResource | null {
  if (!log.resource) return null
  return typeof log.resource === 'string' ? { resourceType: log.resource, resourceId: '' } : log.resource
}

function DetailField({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('font-medium', mono && 'font-mono text-xs')}>{value}</p>
    </div>
  )
}

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Filters
  const [tenantIdFilter, setTenantIdFilter] = useState('')
  const [actorIdFilter, setActorIdFilter] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [resourceTypeFilter, setResourceTypeFilter] = useState('all')
  const [resourceIdFilter, setResourceIdFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Statistics
  const [groupBy, setGroupBy] = useState<'eventType' | 'severity' | 'day' | 'actorType'>('severity')
  const [statistics, setStatistics] = useState<{ _id: string; count: number }[]>([])
  const [statsLoading, setStatsLoading] = useState(true)

  // Verify integrity
  const [showVerifyDialog, setShowVerifyDialog] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ isValid: boolean; tamperedCount: number; details: VerifyDetail[] } | null>(null)

  // Detail view
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [resourceTrail, setResourceTrail] = useState<AuditLogEntry[] | null>(null)
  const [resourceTrailLoading, setResourceTrailLoading] = useState(false)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    try {
      const json = await auditFetch('/v1/audit', {
        tenantId: tenantIdFilter || undefined,
        actorId: actorIdFilter || undefined,
        eventType: eventTypeFilter !== 'all' ? eventTypeFilter : undefined,
        resourceType: resourceTypeFilter !== 'all' ? resourceTypeFilter : undefined,
        resourceId: resourceIdFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        skip: (page - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
      })
      const mapped: AuditLogEntry[] = (json.data || []).map((entry: any) => ({ ...entry, id: entry.eventId || entry._id }))
      setLogs(mapped)
      setTotal(json.pagination?.total ?? json.meta?.total ?? mapped.length)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load audit logs')
    } finally {
      setIsLoading(false)
    }
  }, [tenantIdFilter, actorIdFilter, eventTypeFilter, resourceTypeFilter, resourceIdFilter, startDate, endDate, page])

  const fetchStatistics = useCallback(async () => {
    setStatsLoading(true)
    try {
      const json = await auditFetch('/v1/audit/statistics', { groupBy })
      const stats = [...(json.data?.statistics || [])].sort((a: any, b: any) => b.count - a.count)
      setStatistics(stats)
    } catch {
      // Statistics are supplementary — a failed fetch here shouldn't block the log list.
    } finally {
      setStatsLoading(false)
    }
  }, [groupBy])

  // Debounce the actual network call (not the input state) so text-filter
  // inputs stay fully controlled — a plain remount-on-clear trick isn't
  // needed since the displayed value always matches state directly.
  // Skip the delay on the very first fetch so the page doesn't sit idle
  // for 350ms before showing anything.
  const isFirstFetch = useRef(true)
  useEffect(() => {
    if (isFirstFetch.current) {
      isFirstFetch.current = false
      fetchLogs()
      return
    }
    const t = setTimeout(() => { fetchLogs() }, 350)
    return () => clearTimeout(t)
  }, [fetchLogs])

  useEffect(() => { fetchStatistics() }, [fetchStatistics])

  const clearFilters = () => {
    setTenantIdFilter('')
    setActorIdFilter('')
    setEventTypeFilter('all')
    setResourceTypeFilter('all')
    setResourceIdFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const hasActiveFilters = !!(
    tenantIdFilter || actorIdFilter || eventTypeFilter !== 'all' ||
    resourceTypeFilter !== 'all' || resourceIdFilter || startDate || endDate
  )

  const handleVerifyIntegrity = async () => {
    setShowVerifyDialog(true)
    setVerifying(true)
    setVerifyResult(null)
    try {
      const json = await auditFetch('/v1/audit/verify')
      setVerifyResult(json.data)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to verify audit integrity')
      setShowVerifyDialog(false)
    } finally {
      setVerifying(false)
    }
  }

  const handleRowClick = async (log: AuditLogEntry) => {
    setSelectedLog(log)
    setShowDetailDialog(true)
    setResourceTrail(null)
    setDetailLoading(true)
    try {
      const json = await auditFetch(`/v1/audit/${log.eventId}`)
      setSelectedLog({ ...json.data, id: json.data.eventId || json.data._id })
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load audit log details')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleViewResourceTrail = async () => {
    const resource = selectedLog && getResource(selectedLog)
    if (!resource?.resourceType || !resource?.resourceId) return
    setResourceTrailLoading(true)
    try {
      const json = await auditFetch(`/v1/audit/resource/${resource.resourceType}/${resource.resourceId}`)
      setResourceTrail(json.data || [])
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load resource trail')
    } finally {
      setResourceTrailLoading(false)
    }
  }

  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      accessor: (log) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
        </span>
      ),
    },
    {
      key: 'eventType',
      header: 'Event Type',
      accessor: (log) => <code className="text-xs font-mono">{log.eventType}</code>,
    },
    {
      key: 'severity',
      header: 'Severity',
      accessor: (log) => (
        <Badge className={cn('text-xs capitalize', SEVERITY_STYLES[log.severity] ?? 'bg-muted text-muted-foreground')}>
          {log.severity}
        </Badge>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      accessor: (log) => (
        <div className="text-sm">
          <p className="font-medium">{log.actor?.actorName || log.actor?.actorId || '—'}</p>
          <p className="text-xs text-muted-foreground capitalize">{log.actor?.actorType}</p>
        </div>
      ),
    },
    {
      key: 'resource',
      header: 'Resource',
      accessor: (log) => {
        const resource = getResource(log)
        if (!resource) return <span className="text-muted-foreground text-xs">—</span>
        return (
          <div className="text-sm">
            <p className="font-medium capitalize">{resource.resourceType?.replace('_', ' ')}</p>
            {resource.resourceId && (
              <p className="text-xs text-muted-foreground font-mono truncate max-w-[160px]">{resource.resourceId}</p>
            )}
          </div>
        )
      },
    },
    {
      key: 'description',
      header: 'Description',
      accessor: (log) => (
        <p className="text-sm text-muted-foreground truncate max-w-[280px]" title={log.description}>
          {log.description}
        </p>
      ),
    },
  ]

  const totalStatCount = statistics.reduce((sum, s) => sum + s.count, 0)
  const selectedResource = selectedLog ? getResource(selectedLog) : null

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Platform-wide activity trail across tenants, invoices, and system events</p>
        </div>
        <Button variant="outline" onClick={handleVerifyIntegrity} className="rounded-full">
          <ShieldCheck className="w-4 h-4 mr-2" />
          Verify Integrity
        </Button>
      </div>

      {/* Statistics */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Statistics</CardTitle>
            <CardDescription>Event counts over the last 30 days</CardDescription>
          </div>
          <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="severity">By Severity</SelectItem>
              <SelectItem value="eventType">By Event Type</SelectItem>
              <SelectItem value="actorType">By Actor Type</SelectItem>
              <SelectItem value="day">By Day</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : statistics.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No data for this period.</p>
          ) : (
            <ScrollArea className="max-h-[240px]">
              <div className="space-y-2 pr-2">
                {statistics.map((stat) => (
                  <div key={stat._id} className="flex items-center gap-3 text-sm">
                    <span className="w-40 shrink-0 truncate font-mono text-xs">{stat._id}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${totalStatCount ? (stat.count / totalStatCount) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-muted-foreground shrink-0">{stat.count}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Filters</CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Tenant ID</Label>
            <Input
              placeholder="e.g. BIZ_1234567890"
              value={tenantIdFilter}
              onChange={(e) => { setTenantIdFilter(e.target.value); setPage(1) }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Actor ID</Label>
            <Input
              placeholder="User/tenant/system ID"
              value={actorIdFilter}
              onChange={(e) => { setActorIdFilter(e.target.value); setPage(1) }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Resource ID</Label>
            <Input
              placeholder="Resource ID"
              value={resourceIdFilter}
              onChange={(e) => { setResourceIdFilter(e.target.value); setPage(1) }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Event Type</Label>
            <Select value={eventTypeFilter} onValueChange={(v) => { setEventTypeFilter(v); setPage(1) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All Event Types</SelectItem>
                {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Resource Type</Label>
            <Select value={resourceTypeFilter} onValueChange={(v) => { setResourceTypeFilter(v); setPage(1) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resource Types</SelectItem>
                {RESOURCE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1) }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1) }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <DataTable
        data={logs}
        columns={columns}
        isLoading={isLoading}
        currentPage={page}
        pageSize={PAGE_SIZE}
        totalItems={total}
        onPageChange={setPage}
        onRowClick={handleRowClick}
        emptyMessage="No audit logs found"
      />

      {/* Verify Integrity Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Integrity Verification</DialogTitle>
            <DialogDescription>Checks the most recent 5,000 audit log entries for tampering.</DialogDescription>
          </DialogHeader>
          {verifying ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : verifyResult ? (
            <div className="space-y-4">
              <div className={cn(
                'flex items-center gap-3 p-4 rounded-lg border',
                verifyResult.isValid ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'
              )}>
                {verifyResult.isValid ? (
                  <ShieldCheck className="h-5 w-5 text-success shrink-0" />
                ) : (
                  <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
                )}
                <p className={cn('text-sm font-medium', verifyResult.isValid ? 'text-success' : 'text-destructive')}>
                  {verifyResult.isValid
                    ? 'All logs verified — no tampering detected'
                    : `${verifyResult.tamperedCount} tampered ${verifyResult.tamperedCount === 1 ? 'entry' : 'entries'} found`}
                </p>
              </div>
              {verifyResult.details.length > 0 && (
                <ScrollArea className="max-h-[320px]">
                  <div className="space-y-2 pr-2">
                    {verifyResult.details.map((d) => (
                      <div key={d.eventId} className="p-3 rounded-lg border bg-muted/30 text-xs space-y-1">
                        <p className="font-mono font-medium">{d.eventId}</p>
                        <p className="text-muted-foreground">{format(new Date(d.timestamp), 'MMM d, yyyy HH:mm:ss')}</p>
                        <div className="flex gap-4">
                          <span className={d.isCurrentValid ? 'text-success' : 'text-destructive'}>
                            Hash: {d.isCurrentValid ? 'valid' : 'invalid'}
                          </span>
                          <span className={d.isChainValid ? 'text-success' : 'text-destructive'}>
                            Chain: {d.isChainValid ? 'valid' : 'invalid'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={showDetailDialog}
        onOpenChange={(open) => { setShowDetailDialog(open); if (!open) { setSelectedLog(null); setResourceTrail(null) } }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>{resourceTrail ? 'Resource Audit Trail' : 'Audit Log Details'}</DialogTitle>
            {selectedLog && !resourceTrail && (
              <DialogDescription className="font-mono text-xs">{selectedLog.eventId}</DialogDescription>
            )}
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : resourceTrail ? (
            <div className="space-y-3">
              <Button variant="ghost" size="sm" onClick={() => setResourceTrail(null)} className="-ml-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to entry
              </Button>
              {resourceTrailLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : resourceTrail.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No history found for this resource.</p>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-2 pr-2">
                    {resourceTrail.map((entry) => (
                      <div key={entry.eventId} className="p-3 rounded-lg border text-sm space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <code className="text-xs font-mono">{entry.eventType}</code>
                          <Badge className={cn('text-xs capitalize', SEVERITY_STYLES[entry.severity] ?? 'bg-muted text-muted-foreground')}>
                            {entry.severity}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{entry.description}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(entry.timestamp), 'MMM d, yyyy HH:mm:ss')}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          ) : selectedLog ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <DetailField label="Event Type" value={selectedLog.eventType} mono />
                <DetailField label="Severity" value={selectedLog.severity} />
                <DetailField label="Actor Type" value={selectedLog.actor?.actorType} />
                <DetailField label="Actor" value={selectedLog.actor?.actorName || selectedLog.actor?.actorId} />
                <DetailField label="Resource Type" value={selectedResource?.resourceType} />
                <DetailField label="Resource ID" value={selectedResource?.resourceId} mono />
                <DetailField label="Tenant ID" value={selectedLog.tenantId} mono />
                <DetailField label="Timestamp" value={format(new Date(selectedLog.timestamp), 'MMM d, yyyy HH:mm:ss')} />
                {selectedLog.requestMethod && (
                  <DetailField label="Request" value={`${selectedLog.requestMethod} ${selectedLog.requestPath || ''}`} mono />
                )}
                {selectedLog.responseStatus !== undefined && (
                  <DetailField label="Response Status" value={String(selectedLog.responseStatus)} />
                )}
                {selectedLog.duration !== undefined && (
                  <DetailField label="Duration" value={`${selectedLog.duration}ms`} />
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm">{selectedLog.description}</p>
              </div>

              {selectedLog.changes && (selectedLog.changes.before || selectedLog.changes.after) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-xs text-muted-foreground">Before</Label>
                    <JsonBlock data={selectedLog.changes.before} className="max-h-[200px]" />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-xs text-muted-foreground">After</Label>
                    <JsonBlock data={selectedLog.changes.after} className="max-h-[200px]" />
                  </div>
                </div>
              )}

              {selectedLog.error && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-destructive">Error</Label>
                  <p className="text-sm text-destructive">{selectedLog.error.message}</p>
                </div>
              )}

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">Metadata</Label>
                  <KeyValueTable data={selectedLog.metadata} className="max-h-[200px] overflow-y-auto" />
                </div>
              )}

              {selectedResource?.resourceType && selectedResource?.resourceId && (
                <Button variant="outline" size="sm" onClick={handleViewResourceTrail} disabled={resourceTrailLoading}>
                  {resourceTrailLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  View Full Resource Trail
                </Button>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
