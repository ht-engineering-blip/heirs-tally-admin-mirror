'use client'

import { useEffect } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createMonitoringApi } from '@/lib/api/monitoring-api'
import { type FailureCategory } from '@/types/monitoring'
import {
  BreakdownCard,
  DailyTrendChart,
  FetchErrorState,
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
  const { from, to } = resolveDateRange(filters)

  // keepPreviousData avoids an empty page on first mount when this tab's
  // data is already cached from a previous visit, but isFetching still
  // drives the skeleton below — an explicit filter change should visibly
  // show a fetch is happening, not silently swap the numbers once it's done.
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ['monitoring-overview', from, to, filters.tenantId, filters.erpSystem, filters.documentType, filters.failureCategory],
    queryFn: async () => {
      const res = await api.getOverview({
        from,
        to,
        tenantId: filters.tenantId || undefined,
        erpSystem: filters.erpSystem || undefined,
        documentType: filters.documentType !== 'all' ? filters.documentType : undefined,
        failureCategory: filters.failureCategory !== 'all' ? (filters.failureCategory as FailureCategory) : undefined,
      })
      return res.data
    },
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    // React Query's default retries 3 times with growing backoff before
    // settling into an error — isFetching stays true the whole time, so
    // without this a real outage (e.g. a 504) looked like the page was
    // stuck loading for 20+ seconds instead of showing FetchErrorState.
    retry: false,
  })

  useEffect(() => {
    if (error) toast.error((error as Error)?.message || 'Failed to load monitoring overview')
  }, [error])

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

      {isFetching ? (
        <OverviewSkeleton />
      ) : error ? (
        <FetchErrorState message={(error as Error)?.message} onRetry={() => refetch()} />
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
        </div>
      )}
    </div>
  )
}
