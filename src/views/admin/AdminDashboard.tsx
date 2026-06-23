'use client'

import { useEffect, useState } from 'react';
import {
  Building2,
  FileText,
  Clock,
  Server,
} from 'lucide-react';
import {
  KpiCard,
  ErpDistributionChart,
  TenantStatusChart,
} from '@/components/dashboard';
import { getAdminApiClient } from '@/lib/api/client';
import { useSession } from '@/hooks/use-session';
import { useSupportedErps, formatErpName } from '@/hooks/use-supported-erps';
import { SectionLoader } from '@/components/shared/SectionLoader';

interface TenantSummary {
  total: number;
  active: number;
  suspended: number;
  inactive: number;
  pending: number;
}

export default function AdminDashboard() {
  const [tenantSummary, setTenantSummary] = useState<TenantSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useSession();
  const { erps: supportedErps, isLoading: erpsLoading } = useSupportedErps({ includeAll: true });

  useEffect(() => {
    async function fetchTenants() {
      try {
        const api = getAdminApiClient();

        // Fetch all tenants (first page with high limit to get total + statuses)
        const response = await api.v1.tenants.get({
          query: { limit: 1000, page: 1 },
        });

        const rawTenants = response.data?.data;
        if (!response.error && Array.isArray(rawTenants)) {
          const tenants = rawTenants as any[];
          const summary: TenantSummary = {
            total: (response.data as any).pagination?.total || tenants.length,
            active: tenants.filter((t: any) => t.status === 'active' || t.onboarding?.status === 'active').length,
            suspended: tenants.filter((t: any) => t.status === 'suspended').length,
            inactive: tenants.filter((t: any) => t.status === 'inactive').length,
            pending: tenants.filter((t: any) => t.onboarding?.status === 'pending' || t.onboarding?.status === 'in_progress').length,
          };
          setTenantSummary(summary);
        }
      } catch (error) {
        console.error('Failed to fetch tenant data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTenants();
  }, []);

  // Build ERP distribution data from real supported ERPs
  const erpDistributionData = (supportedErps ?? []).map((erp) => ({
    name: formatErpName(erp.source_type),
    value: 1,
    color: '',
  }));

  // Build tenant status chart data from real counts
  const tenantStatusData = tenantSummary
    ? [
        { status: 'Active', count: tenantSummary.active, color: 'hsl(var(--success))' },
        { status: 'Pending Onboarding', count: tenantSummary.pending, color: 'hsl(var(--warning))' },
        { status: 'Suspended', count: tenantSummary.suspended, color: 'hsl(var(--destructive))' },
        { status: 'Inactive', count: tenantSummary.inactive, color: 'hsl(var(--muted-foreground))' },
      ].filter((s) => s.count > 0)
    : [];

  if (isLoading) {
    return <SectionLoader message="Loading dashboard" />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user?.name || 'Admin'}
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your system configuration, tenants, and more from this dashboard.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Total Tenants"
          value={tenantSummary?.total ?? 0}
          icon={Building2}
          subtitle={`${tenantSummary?.active ?? 0} active`}
        />
        <KpiCard
          title="Active Tenants"
          value={tenantSummary?.active ?? 0}
          icon={Building2}
          subtitle="Currently active"
          variant="success"
        />
        <KpiCard
          title="Pending Onboarding"
          value={tenantSummary?.pending ?? 0}
          icon={Clock}
          subtitle="Awaiting setup"
          variant="primary"
        />
        <KpiCard
          title="Supported ERPs"
          value={supportedErps?.length ?? 0}
          icon={Server}
          subtitle="Configured integrations"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tenantStatusData.length > 0 && (
          <TenantStatusChart data={tenantStatusData} />
        )}
        {!erpsLoading && erpDistributionData.length > 0 && (
          <ErpDistributionChart data={erpDistributionData} />
        )}
      </div>
    </div>
  );
}
