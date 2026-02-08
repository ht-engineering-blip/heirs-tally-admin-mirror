'use client'

import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, CheckCircle, XCircle, Server } from 'lucide-react';
import { DataTable, Column, StatusBadge } from '@/components/shared';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

interface Erp {
  id: string;
  name: string;
  version: string;
  status: 'active' | 'inactive';
  tenantCount: number;
  lastUpdated: string;
}

const mockErps: Erp[] = [
  { id: '1', name: 'SAP Business One', version: '10.0', status: 'active', tenantCount: 104, lastUpdated: '2025-01-15' },
  { id: '2', name: 'Oracle NetSuite', version: '2024.1', status: 'active', tenantCount: 69, lastUpdated: '2025-01-20' },
  { id: '3', name: 'Sage 300', version: '2024', status: 'active', tenantCount: 37, lastUpdated: '2024-12-10' },
  { id: '4', name: 'QuickBooks Online', version: 'Latest', status: 'active', tenantCount: 25, lastUpdated: '2025-01-05' },
  { id: '5', name: 'Tally Prime', version: '3.0', status: 'inactive', tenantCount: 8, lastUpdated: '2024-08-20' },
  { id: '6', name: 'Microsoft Dynamics 365', version: '2024 Wave 2', status: 'active', tenantCount: 5, lastUpdated: '2025-02-01' },
];

export default function AdminErpSupport() {
  const columns: Column<Erp>[] = [
    {
      key: 'name',
      header: 'ERP System',
      sortable: true,
      accessor: (erp) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Server className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{erp.name}</p>
            <p className="text-sm text-muted-foreground">Version {erp.version}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (erp) => (
        <div className="flex items-center gap-2">
          {erp.status === 'active' ? (
            <CheckCircle className="w-4 h-4 text-success" />
          ) : (
            <XCircle className="w-4 h-4 text-muted-foreground" />
          )}
          <StatusBadge status={erp.status} />
        </div>
      ),
    },
    {
      key: 'tenantCount',
      header: 'Tenants Using',
      sortable: true,
      accessor: (erp) => (
        <span className="font-medium">{erp.tenantCount}</span>
      ),
    },
    {
      key: 'lastUpdated',
      header: 'Last Updated',
      accessor: (erp) => (
        <span className="text-sm text-muted-foreground">
          {new Date(erp.lastUpdated).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const rowActions = (erp: Erp) => (
    <>
      <DropdownMenuItem>
        <Edit className="w-4 h-4 mr-2" />
        Edit Mapping
      </DropdownMenuItem>
      <DropdownMenuItem className="text-destructive">
        <Trash2 className="w-4 h-4 mr-2" />
        Remove
      </DropdownMenuItem>
    </>
  );

  return ( 
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">ERP Support Management</h1>
            <p className="page-subtitle">Manage supported ERP systems and field mappings</p>
          </div>
          <Button className="rounded-full">
            <Plus className="w-4 h-4 mr-2" />
            Add ERP
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">6</p>
                <p className="text-muted-foreground">Supported ERPs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-success">5</p>
                <p className="text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">248</p>
                <p className="text-muted-foreground">Total Integrations</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <DataTable
          data={mockErps}
          columns={columns}
          searchPlaceholder="Search ERP systems..."
          rowActions={rowActions}
          emptyMessage="No ERP systems configured"
        />
      </div> 
  );
}
