'use client'

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Eye, Edit, Trash2, MoreHorizontal, Power, Building2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { DataTable, Column, FilterOption, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import type { Tenant } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

const tenantFilters: FilterOption[] = [
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
      { value: 'suspended', label: 'Suspended' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
  {
    key: 'plan',
    label: 'Plan',
    options: [
      { value: 'starter', label: 'Starter' },
      { value: 'professional', label: 'Professional' },
      { value: 'enterprise', label: 'Enterprise' },
    ],
  },
];

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const response = await api.tenants.getAll({
        page,
        pageSize: 10,
        search: searchQuery,
        ...filters,
      });
      setTenants(response.data);
      setTotal(response.pagination?.total || response.data.length);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      toast.error('Failed to load tenants');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [page, searchQuery, filters]);

  const handleStatusChange = async (tenant: Tenant, newStatus: Tenant['status']) => {
    try {
      await api.tenants.updateStatus(tenant.id, newStatus);
      toast.success(`Tenant ${newStatus === 'active' ? 'activated' : newStatus}`);
      fetchTenants();
    } catch (error) {
      toast.error('Failed to update tenant status');
    }
  };

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      starter: 'bg-muted text-muted-foreground',
      professional: 'bg-info/10 text-info',
      enterprise: 'bg-primary/10 text-primary',
    };
    return colors[plan] || 'bg-muted text-muted-foreground';
  };

  const columns: Column<Tenant>[] = [
    {
      key: 'businessName',
      header: 'Business',
      sortable: true,
      accessor: (tenant) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {tenant.businessName.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{tenant.businessName}</p>
            <p className="text-sm text-muted-foreground">{tenant.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'tin',
      header: 'TIN',
      accessor: (tenant) => (
        <span className="font-mono text-sm">{tenant.tin}</span>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      accessor: (tenant) => (
        <Badge className={getPlanBadge(tenant.plan)}>
          {tenant.plan}
        </Badge>
      ),
    },
    {
      key: 'erpType',
      header: 'ERP',
      accessor: (tenant) => (
        <span className="text-sm">{tenant.erpType}</span>
      ),
    },
    {
      key: 'invoiceCount',
      header: 'Invoices',
      sortable: true,
      accessor: (tenant) => (
        <span className="font-medium">
          {tenant.invoiceCount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (tenant) => <StatusBadge status={tenant.status} />,
    },
    {
      key: 'lastActivity',
      header: 'Last Activity',
      sortable: true,
      accessor: (tenant) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(tenant.lastActivity), { addSuffix: true })}
        </span>
      ),
    },
  ];

  const rowActions = (tenant: Tenant) => (
    <>
      <DropdownMenuItem>
        <Eye className="w-4 h-4 mr-2" />
        View Details
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Edit className="w-4 h-4 mr-2" />
        Edit
      </DropdownMenuItem>
      {tenant.status === 'active' ? (
        <DropdownMenuItem
          onClick={() => handleStatusChange(tenant, 'suspended')}
          className="text-warning"
        >
          <Power className="w-4 h-4 mr-2" />
          Suspend
        </DropdownMenuItem>
      ) : tenant.status === 'suspended' ? (
        <DropdownMenuItem
          onClick={() => handleStatusChange(tenant, 'active')}
          className="text-success"
        >
          <Power className="w-4 h-4 mr-2" />
          Activate
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem className="text-destructive">
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </DropdownMenuItem>
    </>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Tenant Management</h1>
            <p className="page-subtitle">Manage all registered tenants on the platform</p>
          </div>
          <Button className="rounded-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Tenant
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="kpi-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">248</p>
                <p className="text-sm text-muted-foreground">Total Tenants</p>
              </div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">186</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">32</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </div>
          <div className="kpi-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">18</p>
                <p className="text-sm text-muted-foreground">Suspended</p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          data={tenants}
          columns={columns}
          searchPlaceholder="Search tenants by name, TIN, or email..."
          filters={tenantFilters}
          rowActions={rowActions}
          selectable
          isLoading={isLoading}
          currentPage={page}
          totalItems={total}
          onPageChange={setPage}
          onSearch={setSearchQuery}
          onFilterChange={setFilters}
          emptyMessage="No tenants found"
        />
      </div>
    </DashboardLayout>
  );
}
