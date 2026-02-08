'use client'

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Plus, RefreshCw, Trash2, Eye, Copy, Key } from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { DataTable, Column, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import type { ApiKey } from '@/lib/mockData';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      accessor: (key) => (
        <span className="text-sm text-muted-foreground">
          {new Date(key.expiresAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

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
          data={apiKeys}
          columns={columns}
          searchPlaceholder="Search by tenant..."
          rowActions={rowActions}
          isLoading={isLoading}
          emptyMessage="No API keys found"
        />
      </div> 
  );
}
