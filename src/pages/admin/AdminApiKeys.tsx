'use client'

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Plus, RefreshCw, Trash2, Eye, Copy, Key } from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { DataTable, Column, FilterOption, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import type { ApiKey } from '@/lib/mockData';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const apiKeyFilters: FilterOption[] = [
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'all', label: 'All Statuses' },
      { value: 'active', label: 'Active' },
      { value: 'revoked', label: 'Revoked' },
      { value: 'expired', label: 'Expired' },
    ],
  },
];

export default function AdminApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const fetchApiKeys = async () => {
    setIsLoading(true);
    try {
      const response = await api.apiKeys.getAll();
      setApiKeys(response.data);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const handleRotate = async (keyId: string) => {
    try {
      await api.apiKeys.rotate(keyId);
      toast.success('API key rotated successfully');
      fetchApiKeys();
    } catch (error) {
      toast.error('Failed to rotate API key');
    }
  };

  const handleRevoke = async (keyId: string) => {
    try {
      await api.apiKeys.revoke(keyId);
      toast.success('API key revoked');
      fetchApiKeys();
    } catch (error) {
      toast.error('Failed to revoke API key');
    }
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API key copied to clipboard');
  };

  const columns: Column<ApiKey>[] = [
    {
      key: 'tenantName',
      header: 'Tenant',
      sortable: true,
      accessor: (key) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Key className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{key.tenantName}</p>
            <p className="text-sm text-muted-foreground">ID: {key.tenantId}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'maskedKey',
      header: 'API Key',
      accessor: (key) => (
        <div className="flex items-center gap-2">
          <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
            {key.maskedKey}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleCopy(key.maskedKey)}
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (key) => <StatusBadge status={key.status} />,
    },
    {
      key: 'callCount',
      header: 'API Calls',
      sortable: true,
      accessor: (key) => (
        <span className="font-medium">{key.callCount.toLocaleString()}</span>
      ),
    },
    {
      key: 'lastUsed',
      header: 'Last Used',
      sortable: true,
      accessor: (key) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(key.lastUsed), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      sortable: true,
      accessor: (key) => (
        <span className="text-sm text-muted-foreground">
          {new Date(key.expiresAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    const sorted = [...apiKeys].sort((a, b) => {
      let aVal: any = a[key as keyof ApiKey];
      let bVal: any = b[key as keyof ApiKey];
      
      if (key === 'lastUsed' || key === 'expiresAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (key === 'callCount') {
        aVal = Number(aVal);
        bVal = Number(bVal);
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
    setApiKeys(sorted);
  };

  // Filter and search data
  const filteredApiKeys = apiKeys.filter((key) => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      if (
        !key.tenantName.toLowerCase().includes(searchLower) &&
        !key.tenantId.toLowerCase().includes(searchLower) &&
        !key.maskedKey.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    
    // Status filter
    if (filters.status && filters.status !== 'all') {
      if (key.status !== filters.status) {
        return false;
      }
    }
    
    return true;
  });

  const rowActions = (key: ApiKey) => (
    <>
      <DropdownMenuItem>
        <Eye className="w-4 h-4 mr-2" />
        View Usage
      </DropdownMenuItem>
      {key.status === 'active' && (
        <>
          <DropdownMenuItem onClick={() => handleRotate(key.id)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Rotate Key
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleRevoke(key.id)}
            className="text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Revoke Key
          </DropdownMenuItem>
        </>
      )}
    </>
  );

  return ( 
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">API Key Management</h1>
            <p className="page-subtitle">Manage tenant API keys and access</p>
          </div>
          <Button className="rounded-full">
            <Plus className="w-4 h-4 mr-2" />
            Create API Key
          </Button>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">API Key Security</CardTitle>
            <CardDescription>
              API keys provide programmatic access to the platform. Rotate keys regularly and
              never share them publicly. Keys can be revoked immediately if compromised.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Data Table */}
        <DataTable
          data={filteredApiKeys}
          columns={columns}
          searchPlaceholder="Search by tenant name, ID, or key..."
          filters={apiKeyFilters}
          rowActions={rowActions}
          isLoading={isLoading}
          onSearch={setSearchQuery}
          onFilterChange={setFilters}
          onSort={handleSort}
          emptyMessage="No API keys found"
        />
      </div> 
  );
}
