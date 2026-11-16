'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createMonitoringApi } from '@/lib/api/monitoring-api'
import {
  type FailureCategory,
  type MonitoringOverview as MonitoringOverviewData,
} from '@/types/monitoring'
import {
  BreakdownCard,
  DailyTrendChart,
  DataCoverageFooter,
  FilterBar,
  FunnelTiles,
  MonitoringSubNav,
  OverviewSkeleton,
  resolveDateRange,
  useMonitoringFilters,
} from './shared'
import { toast } from 'sonner'

const api = createMonitoringApi()

export default function MonitoringOverview() {
  const router = useRouter()
  const [filters, setFilters] = useMonitoringFilters()
  const [data, setData] = useState<MonitoringOverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isFirstFetch = useRef(true)

  const fetchOverview = useCallback(async () => {
    setIsLoading(true)
    try {
      const { from, to } = resolveDateRange(filters)
      const res = await api.getOverview({
        from,
        to,
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

  useEffect(() => {
    if (isFirstFetch.current) {
      isFirstFetch.current = false
      fetchOverview()
      return
    }
    const t = setTimeout(fetchOverview, 350)
    return () => clearTimeout(t)
  }, [fetchOverview])

  const handleViewTenant = (tenantId: string) => {
    router.push(`/admin/monitoring/company?tenantId=${encodeURIComponent(tenantId)}`)
  }

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

      {isLoading && !data ? (
        <OverviewSkeleton />
      ) : !data ? null : (
        <div className="space-y-6">
          <FunnelTiles funnel={data.funnel} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily trend</CardTitle>
            </CardHeader>
            <CardContent>
              <DailyTrendChart data={data.dailyTrend} />
            </CardContent>
          </Card>

          <BreakdownCard data={data} onViewTenant={handleViewTenant} />

          <DataCoverageFooter coverage={data.dataCoverage} />
        </div>
      )}
    </div>
  )
}
