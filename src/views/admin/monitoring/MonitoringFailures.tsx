'use client'

import { useCallback, useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Column, DataTable } from '@/components/shared/DataTable'
import { DataCoverageNote } from '@/components/shared/DataCoverageNote'
import { ExportDialog } from '@/components/shared/ExportDialog'
import { createMonitoringApi } from '@/lib/api/monitoring-api'
import {
  NRS_DOCUMENT_TYPE_LABELS,
  type FailureCategory,
  type MonitoringFailureRow,
  type NrsDocumentTypeCode,
  type OutboundInvoiceDetail,
} from '@/types/monitoring'
import { Eye } from 'lucide-react'
import { toast } from 'sonner'
import {
  FAILURE_PAGE_SIZE,
  FetchErrorState,
  FilterBar,
  MonitoringSubNav,
  formatDuration,
  resolveDateRange,
  useMonitoringFilters,
} from './shared'
import { InvoiceDetailModal } from './InvoiceDetailModal'

const api = createMonitoringApi()

type FailureRow = MonitoringFailureRow & { id: string }

export default function MonitoringFailures() {
  const [filters, setFilters] = useMonitoringFilters()
  const [page, setPage] = useState(1)

  const [selectedIrn, setSelectedIrn] = useState<string | null>(null)
  const [detail, setDetail] = useState<OutboundInvoiceDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const fetchDetail = useCallback(async (irn: string) => {
    setDetailLoading(true)
    setDetailError(null)
    try {
      const res = await api.getInvoiceDetail(irn)
      setDetail(res.data)
    } catch (error: any) {
      setDetailError(error?.message || 'Failed to load invoice detail')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const handleViewDetail = (irn: string) => {
    setSelectedIrn(irn)
    setDetail(null)
    setDetailError(null)
    fetchDetail(irn)
  }

  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const { from: exportFrom, to: exportTo } = resolveDateRange(filters)

  // keepPreviousData keeps the current rows mounted (table stays
  // interactive) while the next page/filter result loads, but we still
  // surface isFetching so the table switches to its skeleton rows for the
  // duration of that fetch — a filter change should visibly look like it's
  // doing something, not silently swap rows once it finishes.
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ['monitoring-failures', exportFrom, exportTo, filters.tenantId, filters.erpSystem, filters.documentType, filters.failureCategory, page],
    queryFn: async () => {
      const res = await api.getFailures({
        from: exportFrom,
        to: exportTo,
        tenantId: filters.tenantId || undefined,
        erpSystem: filters.erpSystem || undefined,
        documentType: filters.documentType !== 'all' ? filters.documentType : undefined,
        failureCategory: filters.failureCategory !== 'all' ? (filters.failureCategory as FailureCategory) : undefined,
        page,
        limit: FAILURE_PAGE_SIZE,
      })
      return { rows: res.data.map((row) => ({ ...row, id: row.irn })), total: res.meta.total }
    },
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    // See the same note in MonitoringOverview — without this, a failing
    // request retries 3x with backoff before isFetching ever goes false,
    // so a real outage looked like an indefinite skeleton instead of
    // FetchErrorState.
    retry: false,
  })
  const rows = data?.rows ?? []
  const total = data?.total ?? 0

  useEffect(() => {
    if (error) toast.error((error as Error)?.message || 'Failed to load failures')
  }, [error])

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
      exportValue: (row) => row.invoiceNumber ? `${row.irn} (${row.invoiceNumber})` : row.irn,
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
      exportValue: (row) => row.failureCategory.replace(/_/g, ' '),
    },
    {
      key: 'reason',
      header: 'Reason',
      accessor: (row) => (
        <p className="text-sm text-muted-foreground truncate max-w-[220px]" title={row.reason}>
          {row.reason || '—'}
        </p>
      ),
      exportValue: (row) => row.reason || '',
    },
    {
      key: 'retryCount',
      header: 'Retries',
      accessor: (row) => <span className={row.retryCount > 0 ? 'font-semibold text-warning' : undefined}>{row.retryCount}</span>,
      exportValue: (row) => row.retryCount,
    },
    {
      key: 'resolutionStatus',
      header: 'Status',
      accessor: (row) => (
        <Badge className={row.resolutionStatus === 'rectified' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
          {row.resolutionStatus}
        </Badge>
      ),
      exportValue: (row) => row.resolutionStatus,
    },
    {
      key: 'timeToResolutionMilliseconds',
      header: (
        <span className="flex items-center gap-1">
          TTR
          <DataCoverageNote text="Time to resolution — how long between the invoice failing and it being marked rectified. '—' means it's still open or was never rectified." />
        </span>
      ),
      exportHeader: 'Time to resolution',
      accessor: (row) => formatDuration(row.timeToResolutionMilliseconds),
      exportValue: (row) => formatDuration(row.timeToResolutionMilliseconds),
    },
  ]

  const rowActions = (row: FailureRow) => (
    <DropdownMenuItem onClick={() => handleViewDetail(row.irn)}>
      <Eye className="w-4 h-4 mr-2" />
      View Details
    </DropdownMenuItem>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Monitoring</h1>
          <p className="page-subtitle">NRS invoice processing health across tenants and ERPs</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <MonitoringSubNav />
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      {!isFetching && error ? (
        <FetchErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          rowActions={rowActions}
          onRowClick={(row) => handleViewDetail(row.irn)}
          isLoading={isFetching}
          currentPage={page}
          pageSize={FAILURE_PAGE_SIZE}
          totalItems={total}
          onPageChange={setPage}
          onExport={async () => setExportDialogOpen(true)}
          emptyMessage="No failures match these filters"
        />
      )}

      <InvoiceDetailModal
        irn={selectedIrn}
        onClose={() => setSelectedIrn(null)}
        isLoading={detailLoading}
        error={detailError}
        detail={detail}
        onRetry={() => selectedIrn && fetchDetail(selectedIrn)}
      />

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        flow={api.exportFlow}
        resource="monitoring_failures"
        label="failures export"
        scope={{
          from: exportFrom,
          to: exportTo,
          tenantId: filters.tenantId || undefined,
          filters: {
            erpSystem: filters.erpSystem || undefined,
            documentType: filters.documentType !== 'all' ? filters.documentType : undefined,
            failureCategory: filters.failureCategory !== 'all' ? filters.failureCategory : undefined,
          },
        }}
      />
    </div>
  )
}
