'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  downloadCompletedJob,
  exportWithToast,
  humanizeExportError,
  type ExportFlow,
} from '@/lib/api/export-api'
import type {
  ExportJobSummary,
  ExportResource,
  ExportResourceDescriptor,
} from '@/types/monitoring'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Download, History, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_BADGE: Record<ExportJobSummary['status'], string> = {
  queued: 'bg-muted text-muted-foreground',
  processing: 'bg-primary/10 text-primary',
  completed: 'bg-success/10 text-success',
  failed: 'bg-destructive/10 text-destructive',
}

const COLUMN_PREFS_KEY = (resource: string) => `export-columns:${resource}`

function loadSavedColumns(resource: string): string[] | null {
  try {
    const raw = localStorage.getItem(COLUMN_PREFS_KEY(resource))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveColumns(resource: string, columns: string[]) {
  try {
    localStorage.setItem(COLUMN_PREFS_KEY(resource), JSON.stringify(columns))
  } catch {
    // ignore — per-viewer convenience only, not required for the feature to work
  }
}

function formatDateTime(iso: string): string {
  try {
    return format(new Date(iso), 'd MMM yyyy, HH:mm')
  } catch {
    return iso
  }
}

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  flow: ExportFlow
  resource: ExportResource
  /** Short noun phrase used in toast copy, e.g. "failures export". */
  label: string
  /** The current page's committed filters, already resolved to what the
   * generic queue endpoint expects — from/to as ISO strings, tenantId only
   * when relevant, and any resource-specific row filters. */
  scope: { from: string; to: string; tenantId?: string; filters?: Record<string, any> }
}

/** Full export experience: pick exactly which columns to include (via the
 * generic POST /v1/export/ queue endpoint, not the resource's fixed default
 * columns), and a "Recent exports" tab to check on or re-download jobs
 * queued earlier instead of losing track of them once this dialog closes. */
export function ExportDialog({ open, onOpenChange, flow, resource, label, scope }: ExportDialogProps) {
  const [tab, setTab] = useState<'new' | 'history'>('new')
  const [descriptor, setDescriptor] = useState<ExportResourceDescriptor | null>(null)
  const [isLoadingResource, setIsLoadingResource] = useState(false)
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set())
  const [isQueuing, setIsQueuing] = useState(false)

  const [jobs, setJobs] = useState<ExportJobSummary[] | null>(null)
  const [isLoadingJobs, setIsLoadingJobs] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTab('new')
    setIsLoadingResource(true)
    flow.listResources()
      .then((res) => {
        const found = res.data.find((d) => d.resource === resource) ?? null
        setDescriptor(found)
        const allKeys = found?.columns.map((c) => c.key) ?? []
        const saved = loadSavedColumns(resource)?.filter((key) => allKeys.includes(key))
        setSelectedColumns(new Set(saved && saved.length > 0 ? saved : allKeys))
      })
      .catch((error: any) => toast.error(error?.message || 'Failed to load export columns'))
      .finally(() => setIsLoadingResource(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resource])

  const fetchJobs = () => {
    setIsLoadingJobs(true)
    flow.listJobs(20)
      .then((res) => setJobs(res.data))
      .catch((error: any) => toast.error(error?.message || 'Failed to load recent exports'))
      .finally(() => setIsLoadingJobs(false))
  }

  useEffect(() => {
    if (open && tab === 'history' && jobs === null) fetchJobs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab])

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      saveColumns(resource, Array.from(next))
      return next
    })
  }

  const toggleAll = () => {
    if (!descriptor) return
    setSelectedColumns((prev) => {
      const next = prev.size === descriptor.columns.length ? new Set<string>() : new Set(descriptor.columns.map((c) => c.key))
      saveColumns(resource, Array.from(next))
      return next
    })
  }

  const handleQueue = async () => {
    if (!descriptor || selectedColumns.size === 0) return
    setIsQueuing(true)
    try {
      const { data: job } = await flow.queueExport({
        resource,
        columns: Array.from(selectedColumns),
        from: scope.from,
        to: scope.to,
        tenantId: scope.tenantId,
        filters: scope.filters,
      })
      onOpenChange(false)
      exportWithToast(flow, job.exportId, { label })
    } catch (error: any) {
      toast.error(error?.message || `Failed to queue your ${label}`)
    } finally {
      setIsQueuing(false)
    }
  }

  const handleRedownload = async (job: ExportJobSummary) => {
    setDownloadingId(job.exportId)
    try {
      await downloadCompletedJob(flow, job)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to download this export')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle>Export {descriptor?.label ?? label}</DialogTitle>
          <DialogDescription>{descriptor?.description ?? 'Choose which columns to include, or check on a previous export.'}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'new' | 'history')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="new">New export</TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-3.5 h-3.5 mr-1.5" /> Recent exports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Period: <span className="font-mono">{formatDateTime(scope.from)}</span> to{' '}
              <span className="font-mono">{formatDateTime(scope.to)}</span>
            </p>

            {isLoadingResource ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            ) : !descriptor ? (
              <p className="text-sm text-destructive">Couldn't load this resource's columns.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Columns ({selectedColumns.size}/{descriptor.columns.length})</p>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={toggleAll}>
                    {selectedColumns.size === descriptor.columns.length ? 'Deselect all' : 'Select all'}
                  </Button>
                </div>
                <ScrollArea className="h-[220px] rounded-md border p-3">
                  <div className="space-y-2">
                    {descriptor.columns.map((col) => (
                      <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={selectedColumns.has(col.key)}
                          onCheckedChange={() => toggleColumn(col.key)}
                        />
                        {col.label}
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleQueue} disabled={!descriptor || selectedColumns.size === 0 || isQueuing}>
                {isQueuing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Queue export
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Your most recent export jobs.</p>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={fetchJobs} disabled={isLoadingJobs}>
                Refresh
              </Button>
            </div>

            {isLoadingJobs ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !jobs || jobs.length === 0 ? (
              <EmptyState icon={History} title="No exports yet" description="Jobs you queue will show up here." compact />
            ) : (
              // A plain scrolling div, not Radix's ScrollArea — its viewport
              // renders its child with `display: table`, which sizes to the
              // error strings' full unbroken width (no spaces to wrap on)
              // instead of respecting the container width, blowing out the
              // whole dialog.
              <div className="h-[260px] overflow-y-auto overflow-x-hidden">
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <div key={job.exportId} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={cn('text-xs capitalize', STATUS_BADGE[job.status])}>{job.status}</Badge>
                          <span className="text-xs text-muted-foreground font-mono truncate">{job.resource}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(job.createdAt)}
                          {job.status === 'completed' && ` · ${job.rowCount.toLocaleString()} rows`}
                        </p>
                        {job.status === 'failed' && job.error && (
                          <p className="text-xs text-destructive break-words line-clamp-2" title={job.error}>
                            {humanizeExportError(job.error)}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        disabled={job.status !== 'completed' || downloadingId === job.exportId}
                        onClick={() => handleRedownload(job)}
                      >
                        {downloadingId === job.exportId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
