'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Column, DataTable } from '@/components/shared/DataTable'
import { DataCoverageNote } from '@/components/shared/DataCoverageNote'
import { createMonitoringApi } from '@/lib/api/monitoring-api'
import {
  NRS_DOCUMENT_TYPE_LABELS,
  type FailureCategory,
  type MonitoringFailureRow,
  type NrsDocumentTypeCode,
} from '@/types/monitoring'
import { toast } from 'sonner'
import {
  FAILURE_PAGE_SIZE,
  FilterBar,
  MonitoringSubNav,
  formatDuration,
  resolveDateRange,
  useMonitoringFilters,
} from './shared'

const api = createMonitoringApi()

type FailureRow = MonitoringFailureRow & { id: string }

export default function MonitoringFailures() {
  const [filters, setFilters] = useMonitoringFilters()
  const [rows, setRows] = useState<FailureRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const isFirstFetch = useRef(true)

  const fetchFailures = useCallback(async () => {
    setIsLoading(true)
    try {
      const { from, to } = resolveDateRange(filters)
      const res = await api.getFailures({
        from,
        to,
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
    </div>
  )
}
