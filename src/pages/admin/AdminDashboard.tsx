'use client'

import { useEffect, useState } from 'react';
import {
  Building2,
  FileText,
  Clock,
  CheckCircle,
} from 'lucide-react'; 
import {
  KpiCard,
  TransactionVolumeChart,
  WeeklyTrendChart,
  ErpDistributionChart,
  TenantStatusChart,
  SystemHealthCard,
  RecentTransactions,
} from '@/components/dashboard';
import { api } from '@/lib/api';
import type { DashboardStats, SystemHealth, Transaction } from '@/lib/mockData';
import {
  mockTransactionVolumeData,
  mockWeeklyTrendData,
  mockErpDistribution,
  mockTenantStatusData,
  mockTransactions,
} from '@/lib/mockData';
import { useSession } from '@/hooks/use-session';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { user, isSuperAdmin } = useSession()

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, healthRes] = await Promise.all([
          api.dashboard.getStats(),
          api.dashboard.getSystemHealth(),
        ]);
        setStats(statsRes.data);
        setHealth(healthRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  if (isLoading || !stats || !health) {
    return ( 
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-muted-foreground">Loading dashboard...</span>
          </div>
        </div> 
    );
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
          <div className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            title="Total Tenants"
            value={formatNumber(stats.totalTenants)}
            icon={Building2}
            trend={{ value: 12.5, isPositive: true }}
            subtitle={`${stats.activeTenants} active`}
          />
          <KpiCard
            title="Total Invoices"
            value={formatNumber(stats.totalInvoices)}
            icon={FileText}
            trend={{ value: 8.2, isPositive: true }}
            subtitle={`${formatNumber(stats.invoicesToday)} today`}
          />
          <KpiCard
            title="Success Rate"
            value={`${stats.successRate}%`}
            icon={CheckCircle}
            trend={{ value: 0.3, isPositive: true }} 
          />
          <KpiCard
            title="Pending Approvals"
            value={stats.pendingApprovals}
            icon={Clock}
            subtitle={`${stats.errorCount} errors`}
           variant="primary"
          />
        </div>

        {/* System Health */}
        <SystemHealthCard health={health} />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TransactionVolumeChart data={mockTransactionVolumeData} />
          </div>
          <ErpDistributionChart data={mockErpDistribution} />
        </div>

        {/* Second Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <WeeklyTrendChart data={mockWeeklyTrendData} />
          </div>
          <TenantStatusChart data={mockTenantStatusData} />
        </div>

        {/* Recent Transactions */}
        <RecentTransactions transactions={mockTransactions} />
      </div> 
  );
}
