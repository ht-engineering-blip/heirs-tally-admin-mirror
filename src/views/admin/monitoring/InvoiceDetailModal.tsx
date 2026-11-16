'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { StatusBadge, FriendlyErrorBlock } from '@/components/shared'
import { humanizeInvoiceError } from '@/lib/errors/friendly-invoice-error'
import { cn } from '@/lib/utils'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import type { OutboundInvoiceDetail } from '@/types/monitoring'

interface InvoiceDetailModalProps {
  irn: string | null
  onClose: () => void
  isLoading: boolean
  error: string | null
  detail: OutboundInvoiceDetail | null
  onRetry: () => void
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  try {
    return format(new Date(value), 'PPpp')
  } catch {
    return value
  }
}

/** Read-only cross-tenant invoice detail for the Failure Explorer — shown in
 * a modal rather than navigating away, since this is a platform-admin
 * drill-in, not the tenant's own actionable invoice page (no resend/retry
 * here; those stay on the tenant-scoped Transactions view). */
export function InvoiceDetailModal({ irn, onClose, isLoading, error, detail, onRetry }: InvoiceDetailModalProps) {
  const open = irn !== null

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Detail</DialogTitle>
          <DialogDescription>
            {detail?.invoice?.invoiceNumber || irn}
            {detail?.invoice?.tenantId && ` · Tenant ${detail.invoice.tenantId}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">Failed to load invoice detail</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="w-3 h-3 mr-2" />
              Retry
            </Button>
          </div>
        ) : detail ? (
          <Tabs defaultValue="overview" className="w-full animate-fade-in">
            <TabsList className="w-full flex overflow-x-auto">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="history" className="text-xs sm:text-sm">History</TabsTrigger>
              <TabsTrigger value="webhooks" className="text-xs sm:text-sm">Webhooks</TabsTrigger>
            </TabsList>
            <ScrollArea className="max-h-[65vh]">
              <TabsContent value="overview" className="space-y-4 mt-4 pb-4">
                {detail.invoice.lastJobError?.error && (
                  <FriendlyErrorBlock
                    title="Last Job Error"
                    error={humanizeInvoiceError(detail.invoice.lastJobError)}
                  />
                )}

                {detail.invoice.workflowState && (
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-xs font-medium text-muted-foreground mb-3">Workflow Progress</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {(['transformed', 'validated', 'signed', 'transmitted', 'delivered'] as const).map((step, idx, arr) => {
                        const done = !!detail.invoice.workflowState?.[step]
                        return (
                          <div key={step} className="flex items-center gap-1">
                            <div className={cn(
                              'px-2 py-1 rounded text-xs font-medium capitalize',
                              done ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                            )}>
                              {step}
                            </div>
                            {idx < arr.length - 1 && (
                              <div className={cn('h-px w-4', done ? 'bg-success/40' : 'bg-border')} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">IRN</p>
                    <p className="font-mono text-xs break-all">{detail.invoice.irn}</p>
                  </div>
                  {detail.invoice.invoiceNumber && (
                    <div>
                      <p className="text-xs text-muted-foreground">Invoice Number</p>
                      <p className="font-mono text-xs break-all">{detail.invoice.invoiceNumber}</p>
                    </div>
                  )}
                  {detail.invoice.customerName && (
                    <div>
                      <p className="text-xs text-muted-foreground">Customer</p>
                      <p className="text-xs break-all">{detail.invoice.customerName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <StatusBadge status={(detail.invoice.status || '').toLowerCase().replace(/_/g, ' ')} labelCase="uppercase" />
                  </div>
                  {detail.invoice.paymentStatus && (
                    <div>
                      <p className="text-xs text-muted-foreground">Payment Status</p>
                      <StatusBadge status={detail.invoice.paymentStatus.toLowerCase().replace(/_/g, ' ')} labelCase="uppercase" />
                    </div>
                  )}
                  {detail.invoice.erpSystem && (
                    <div>
                      <p className="text-xs text-muted-foreground">ERP System</p>
                      <p className="text-sm font-medium capitalize">{detail.invoice.erpSystem.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                  {detail.invoice.validationAttempts !== undefined && (
                    <div>
                      <p className="text-xs text-muted-foreground">Validation Attempts</p>
                      <p className="text-sm font-medium">{detail.invoice.validationAttempts}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm">{formatDate(detail.invoice.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Updated</p>
                    <p className="text-sm">{formatDate(detail.invoice.updatedAt)}</p>
                  </div>
                </div>

                {Array.isArray(detail.invoice.validationErrors) && detail.invoice.validationErrors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-destructive">
                      Validation Errors ({detail.invoice.validationErrors.length})
                    </p>
                    {detail.invoice.validationErrors.map((err, idx) => (
                      <div key={idx} className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs break-words">
                        {typeof err === 'string' ? err : JSON.stringify(err)}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-3 mt-4">
                {detail.statusHistory.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                    <div className="space-y-4">
                      {[...detail.statusHistory].reverse().map((entry, idx, arr) => (
                        <div key={idx} className="flex items-start gap-3 pl-1">
                          <div className={cn(
                            'w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 bg-background z-10',
                            entry.status === 'failed' ? 'border-destructive' : 'border-success'
                          )}>
                            <div className={cn('w-2 h-2 rounded-full', entry.status === 'failed' ? 'bg-destructive' : 'bg-success')} />
                          </div>
                          <div className={cn(
                            'flex-1 p-3 border rounded-lg space-y-2 mb-1',
                            entry.status === 'failed' ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/20'
                          )}>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-sm font-semibold capitalize">
                                {`Step ${arr.length - idx}: ${(entry.step || 'status change').replace(/_/g, ' ')}`}
                              </p>
                              <StatusBadge status={entry.status || 'unknown'} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                              {entry.at && (
                                <div>
                                  <span className="text-muted-foreground">Time: </span>
                                  <span>{formatDate(entry.at)}</span>
                                </div>
                              )}
                              {entry.eventType && (
                                <div>
                                  <span className="text-muted-foreground">Event Type: </span>
                                  <span className="font-mono">{entry.eventType}</span>
                                </div>
                              )}
                            </div>
                            {entry.error && (
                              <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs break-words">
                                <span className="font-medium text-destructive">Error: </span>
                                {entry.error}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8 text-sm">No status history available</p>
                )}
              </TabsContent>

              <TabsContent value="webhooks" className="space-y-4 mt-4 pb-4">
                {detail.webhookEvents.length > 0 ? (
                  <div className="space-y-4">
                    {[...detail.webhookEvents].reverse().map((event, idx) => (
                      <div key={idx} className={cn(
                        'border rounded-lg overflow-hidden',
                        event.status === 'failed' ? 'border-destructive/30' : 'border-border'
                      )}>
                        <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b flex-wrap gap-2">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">{event.eventType || 'Webhook Event'}</p>
                            {event.eventId && <p className="text-xs font-mono text-muted-foreground">{event.eventId}</p>}
                          </div>
                          <StatusBadge status={event.status || 'pending'} />
                        </div>
                        <div className="px-4 py-3 space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                            {event.receivedAt && (
                              <div>
                                <p className="text-muted-foreground">Received</p>
                                <p>{formatDate(event.receivedAt)}</p>
                              </div>
                            )}
                            {event.deliveredAt && (
                              <div>
                                <p className="text-muted-foreground">Delivered</p>
                                <p>{formatDate(event.deliveredAt)}</p>
                              </div>
                            )}
                            {event.failedAt && (
                              <div>
                                <p className="text-muted-foreground">Failed At</p>
                                <p className="text-destructive font-medium">{formatDate(event.failedAt)}</p>
                              </div>
                            )}
                          </div>
                          {event.failureReason && (
                            <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs">
                              <p className="font-medium text-destructive mb-0.5">Failure Reason</p>
                              <p className="text-foreground whitespace-pre-wrap break-all">{event.failureReason}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8 text-sm">No webhook events recorded</p>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
