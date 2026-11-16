'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DataCoverageNote } from '@/components/shared/DataCoverageNote'
import { EmptyState } from '@/components/shared/EmptyState'
import { createMonitoringApi } from '@/lib/api/monitoring-api'
import type { MonitoringHealth as MonitoringHealthData } from '@/types/monitoring'
import { Activity } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  FilterBar,
  HealthSkeleton,
  MonitoringSubNav,
  formatDate,
  formatPercent,
  formatSeconds,
  resolveDateRange,
  useMonitoringFilters,
} from './shared'

const api = createMonitoringApi()

export default function MonitoringHealth() {
  const [filters, setFilters] = useMonitoringFilters()
  const [data, setData] = useState<MonitoringHealthData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isFirstFetch = useRef(true)

  const fetchHealth = useCallback(async () => {
    setIsLoading(true)
    try {
      const { from, to } = resolveDateRange(filters)
      const res = await api.getHealth({
        from,
        to,
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
        <FilterBar filters={filters} onChange={setFilters} showFailureCategory={false} />
      </div>

      {isLoading && !data ? (
        <HealthSkeleton />
      ) : !data ? null : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <CardTitle className="text-base mb-3">Webhook delivery</CardTitle>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Delivered / total</span>
                    <span className="font-mono font-semibold">{data.webhooks.delivered} / {data.webhooks.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Success rate</span>
                    <span className={cn(
                      'font-mono font-semibold',
                      data.webhooks.deliverySuccessRate >= 0.99
                        ? 'text-success'
                        : data.webhooks.deliverySuccessRate < 0.9
                          ? 'text-destructive'
                          : undefined
                    )}>
                      {formatPercent(data.webhooks.deliverySuccessRate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Retrying / failed</span>
                    <span className="font-mono font-semibold">
                      {data.webhooks.retrying} / <span className={data.webhooks.failed > 0 ? 'text-destructive' : undefined}>{data.webhooks.failed}</span>
                    </span>
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
                    <span className="font-mono font-semibold">{data.backlog.processing}</span>
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
                <EmptyState icon={Activity} title="No API traffic in this period" compact />
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
                          <td className={cn('py-2 pr-4 font-semibold', route.errorRate > 0 ? 'text-destructive' : 'text-success')}>
                            {formatPercent(route.errorRate)}
                          </td>
                          <td className="py-2 pr-4">
                            {route.clientErrorCount} / <span className={route.serverErrorCount > 0 ? 'font-semibold text-destructive' : undefined}>{route.serverErrorCount}</span>
                          </td>
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
                <EmptyState icon={Activity} title="No pipeline activity in this period" compact />
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
                          <td className="py-2 pr-4">
                            {step.successCount} / <span className={step.failureCount > 0 ? 'font-semibold text-destructive' : undefined}>{step.failureCount}</span>
                          </td>
                          <td className={cn('py-2 pr-4 font-semibold', step.failureRate > 0 ? 'text-destructive' : 'text-success')}>
                            {formatPercent(step.failureRate)}
                          </td>
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
      )}
    </div>
  )
}
