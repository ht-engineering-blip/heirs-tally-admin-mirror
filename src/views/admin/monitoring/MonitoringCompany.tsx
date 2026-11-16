'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataCoverageNote } from '@/components/shared/DataCoverageNote'
import { EmptyState } from '@/components/shared/EmptyState'
import { TenantCombobox } from '@/components/shared/TenantCombobox'
import { createMonitoringApi } from '@/lib/api/monitoring-api'
import type { MonitoringCompany as MonitoringCompanyData } from '@/types/monitoring'
import { CheckCircle2, SearchX } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { CompanySkeleton, FunnelTiles, MonitoringSubNav, formatDate, formatDuration, toIso } from './shared'

const api = createMonitoringApi()

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

export default function MonitoringCompany() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId') || ''

  const [data, setData] = useState<MonitoringCompanyData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filters] = useState({ from: '', to: '', erpSystem: '', documentType: 'all' })

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

  const handleLookup = (id: string) => {
    router.push(id ? `${pathname}?tenantId=${encodeURIComponent(id)}` : pathname)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Monitoring</h1>
          <p className="page-subtitle">NRS invoice processing health across tenants and ERPs</p>
        </div>
      </div>

      <MonitoringSubNav />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Look up a tenant</CardTitle>
          <CardDescription>Search by business name or tenant ID.</CardDescription>
        </CardHeader>
        <CardContent>
          <TenantCombobox
            value={tenantId}
            onChange={handleLookup}
            placeholder="Search tenants…"
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {isLoading && <CompanySkeleton />}

      {!isLoading && !data && tenantId && (
        <EmptyState
          icon={SearchX}
          title="Tenant not found"
          description={`No monitoring data for "${tenantId}" — check the tenant ID and try again.`}
        />
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
                  <EmptyState
                    icon={CheckCircle2}
                    title="No failures in this period"
                    description="This tenant's invoices processed without an error in the selected range."
                    compact
                  />
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
