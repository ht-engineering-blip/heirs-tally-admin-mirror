'use client'

import { useQuery } from '@tanstack/react-query'
import { FileText, ArrowUpRight, ArrowDownLeft, CheckCircle, Clock, AlertCircle, Activity } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { OnboardingBanner } from '@/components/dashboard/OnboardingBanner'
import { useTenant } from '@/hooks/use-tenant'
import { createTenantApi } from '@/lib/api/tenant-api'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { SectionLoader } from '@/components/shared/SectionLoader'

export default function DashboardPage() {
  const { tenantData, isOnboardingComplete, onboardingProgress, onboardingStatus } = useTenant()

  const tenant = tenantData as Record<string, any> | undefined
  const businessName = tenant?.businessName

  const { data: outboundData, isLoading: outboundLoading } = useQuery({
    queryKey: ['dashboard-outbound'],
    queryFn: async () => {
      const api = createTenantApi()
      const res = await api.getOutboundInvoices({ limit: '5', page: '1' })
      if (res.error) throw new Error('Failed to fetch outbound invoices')
      return res.data
    },
    enabled: isOnboardingComplete,
    staleTime: 2 * 60 * 1000,
  })

  const { data: outboundAllData } = useQuery({
    queryKey: ['dashboard-outbound-stats'],
    queryFn: async () => {
      const api = createTenantApi()
      const res = await api.getOutboundInvoices({ limit: '1', page: '1' })
      if (res.error) throw new Error('Failed to fetch outbound stats')
      return res.data
    },
    enabled: isOnboardingComplete,
    staleTime: 2 * 60 * 1000,
  })

  const { data: inboundAllData } = useQuery({
    queryKey: ['dashboard-inbound-stats'],
    queryFn: async () => {
      const api = createTenantApi()
      const res = await api.getInboundInvoices({ limit: '1', page: '1' })
      if (res.error) throw new Error('Failed to fetch inbound stats')
      return res.data
    },
    enabled: isOnboardingComplete,
    staleTime: 2 * 60 * 1000,
  })

  const outboundTotal = (outboundAllData as any)?.pagination?.total ?? 0
  const inboundTotal = (inboundAllData as any)?.pagination?.total ?? 0
  const totalInvoices = outboundTotal + inboundTotal
  const recentOutbound = ((outboundData as any)?.data ?? []) as any[]

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency || 'NGN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      submitted: 'status-badge status-active',
      validated: 'bg-info/10 text-info',
      pending: 'status-badge status-pending',
      failed: 'status-badge status-error',
      cancelled: 'status-badge status-inactive',
      transformed: 'bg-info/10 text-info',
      signed: 'status-badge status-active',
    }
    return styles[status] || 'status-badge status-inactive'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {businessName ? `Welcome, ${businessName}` : 'Dashboard'}
        </h1>
        <p className="text-muted-foreground">
          Overview of your e-invoicing activity.
        </p>
      </div>

      {/* Onboarding Banner */}
      {!isOnboardingComplete && (
        <OnboardingBanner progress={onboardingProgress} status={onboardingStatus} />
      )}

      {/* KPI Cards */}
      {isOnboardingComplete && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Total Invoices"
            value={totalInvoices}
            icon={FileText}
            subtitle="All time"
            variant="primary"
          />
          <KpiCard
            title="Outbound"
            value={outboundTotal}
            icon={ArrowUpRight}
            subtitle="Sent invoices"
          />
          <KpiCard
            title="Inbound"
            value={inboundTotal}
            icon={ArrowDownLeft}
            subtitle="Received invoices"
          />
          <KpiCard
            title="Status"
            value={tenant?.status === 'active' ? 'Active' : (tenant?.status ?? 'N/A')}
            icon={Activity}
            subtitle="Account status"
            variant="success"
          />
        </div>
      )}

      {/* Recent Transactions */}
      {isOnboardingComplete && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Outbound Invoices</CardTitle>
              {recentOutbound.length > 0 && (
                <Link href="/dashboard/transactions" className="text-sm text-primary hover:underline">
                  View all →
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {outboundLoading ? (
              <SectionLoader message="Loading transactions" size="sm" />
            ) : recentOutbound.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No invoices yet</p>
                <p className="text-xs text-muted-foreground">
                  Invoices will appear here once processed through your ERP integration.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOutbound.map((tx: any) => (
                  <div
                    key={tx.irn}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
                      <ArrowUpRight className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{tx.invoiceNumber || tx.irn}</p>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {tx.customerName || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {tx.totalAmount ? formatAmount(Number(tx.totalAmount), tx.currency || 'NGN') : 'N/A'}
                      </p>
                      {tx.createdAt && (
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                    <Badge className={getStatusBadge(tx.status)}>
                      {tx.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Info Card when onboarding is complete */}
      {isOnboardingComplete && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Business Name</span>
                <span className="font-medium">{tenant?.businessName || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TIN</span>
                <span className="font-medium">{tenant?.tin || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ERP System</span>
                <span className="font-medium">{tenant?.erpSystem || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Contact</span>
                <span className="font-medium">{tenant?.contactEmail || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href="/dashboard/transactions"
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">View Transactions</span>
              </Link>
              <Link
                href="/dashboard/sandbox"
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Test in Sandbox</span>
              </Link>
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Manage Profile</span>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
