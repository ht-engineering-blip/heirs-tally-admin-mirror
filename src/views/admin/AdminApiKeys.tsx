'use client'

import { useState, useEffect, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Plus, RefreshCw, Trash2, Eye, Copy, Key, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DataTable, Column, FilterOption, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAdminApiClient } from '@/lib/api/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

const PAGE_SIZE = 10;

interface ApiKey {
  keyId: string;
  id: string; // Required for DataTable, alias for keyId
  tenantId: string;
  businessName?: string;
  tenantName?: string; // Alias for businessName
  keyName: string;
  keyPrefix: string;
  maskedKey?: string; // Computed from keyPrefix
  fullKey?: string; // Only available immediately after creation
  status: string;
  scopes?: string[];
  createdAt: Date | string;
  expiresAt?: Date | string;
  lastUsedAt?: Date | string;
  lastUsed?: Date | string; // Alias for lastUsedAt
  usageCount?: number;
  callCount?: number; // Alias for usageCount
  description?: string;
  contactEmail?: string;
  tenantStatus?: string;
}

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
  const api = getAdminApiClient();
  const router = useRouter();
  const [allKeys, setAllKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [columnSort, setColumnSort] = useState<{ key: string; order: 'asc' | 'desc' } | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRotateDialog, setShowRotateDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showKeyDisplayModal, setShowKeyDisplayModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string>('');

  // Form states
  const [formData, setFormData] = useState({
    tenantId: '',
    name: '',
    description: '',
    expiresInDays: 365,
    scopes: [] as string[],
  });

  // Fetch tenants for dropdown
  const [tenants, setTenants] = useState<any[]>([]);
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const response = await api.v1.tenants.get({
          query: { limit: 1000 },
        });
        if (response.data?.data) {
          setTenants(response.data.data as any[]);
        }
      } catch (error) {
        console.error('Failed to fetch tenants:', error);
      }
    };
    fetchTenants();
  }, []);

  const apiKeyStatusPriority = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'active') return 0;
    if (s === 'revoked') return 1;
    if (s === 'expired') return 2;
    return 3;
  };

  const filteredKeys = useMemo(() => {
    let result = [...allKeys];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(k =>
        (k.businessName || '').toLowerCase().includes(q) ||
        (k.tenantId || '').toLowerCase().includes(q) ||
        (k.keyName || '').toLowerCase().includes(q) ||
        (k.keyPrefix || '').toLowerCase().includes(q)
      );
    }

    if (filters.status && filters.status !== 'all') {
      result = result.filter(k => (k.status || '').toLowerCase() === filters.status.toLowerCase());
    }

    if (columnSort) {
      result.sort((a, b) => {
        let aVal: any = a[columnSort.key as keyof ApiKey];
        let bVal: any = b[columnSort.key as keyof ApiKey];
        if (['lastUsed', 'lastUsedAt', 'expiresAt', 'createdAt'].includes(columnSort.key)) {
          aVal = new Date(aVal || 0).getTime();
          bVal = new Date(bVal || 0).getTime();
        } else if (['callCount', 'usageCount'].includes(columnSort.key)) {
          aVal = Number(aVal || 0);
          bVal = Number(bVal || 0);
        } else if (columnSort.key === 'keyPrefix' || columnSort.key === 'maskedKey') {
          aVal = (a.keyPrefix || a.maskedKey || '').toLowerCase();
          bVal = (b.keyPrefix || b.maskedKey || '').toLowerCase();
        } else if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = (bVal || '').toLowerCase();
        }
        if (aVal < bVal) return columnSort.order === 'asc' ? -1 : 1;
        if (aVal > bVal) return columnSort.order === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      result.sort((a, b) => {
        const pa = apiKeyStatusPriority(a.status);
        const pb = apiKeyStatusPriority(b.status);
        if (pa !== pb) return pa - pb;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
    }

    return result;
  }, [allKeys, searchQuery, filters, columnSort]);

  const fetchApiKeys = async () => {
    setIsLoading(true);
    try {
      const response = await api.v1.tenants['api-keys'].get({
        query: { page: 1, limit: 1000 },
      });

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Failed to fetch API keys';
        toast.error(errorMessage);
      } else if (response.data?.data) {
        const apiKeysData = response.data.data as any[];
        const transformedKeys: ApiKey[] = apiKeysData.map((key: any) => ({
          keyId: key.keyId || key.id || '',
          id: key.keyId || key.id || '',
          tenantId: key.tenantId,
          businessName: key.businessName,
          tenantName: key.businessName,
          keyName: key.keyName,
          keyPrefix: key.keyPrefix,
          maskedKey: `${key.keyPrefix}****`,
          status: key.status,
          scopes: key.scopes || [],
          createdAt: key.createdAt,
          expiresAt: key.expiresAt,
          lastUsedAt: key.lastUsedAt,
          lastUsed: key.lastUsedAt,
          usageCount: key.usageCount || 0,
          callCount: key.usageCount || 0,
          contactEmail: key.contactEmail,
          tenantStatus: key.tenantStatus,
        }));
        setAllKeys(transformedKeys);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filters]);

  const handleCreate = async () => {
    if (!formData.tenantId || !formData.name) {
      toast.error('Please select a tenant and provide a name for the API key');
      return;
    }

    setSaving(true);
    try {
      // Create API key for tenant using the proper endpoint
      const response = await api.v1.tenants({ tenantId: formData.tenantId })['api-keys'].post({
        name: formData.name,
        expiresInDays: formData.expiresInDays || undefined,
        scopes: formData.scopes.length > 0 ? formData.scopes : undefined,
      });

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || (response.error as any)?.value?.message || 'Failed to create API key';
        toast.error(errorMessage);
      } else if (response.data?.data) {
        const keyData = response.data.data as any;
        const fullKey = keyData.key;

        if (fullKey) {
          setNewlyCreatedKey(fullKey);
          setShowKeyDisplayModal(true);
        }

        toast.success('API key created successfully');
        setShowCreateModal(false);
        resetForm();
        fetchApiKeys();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create API key');
    } finally {
      setSaving(false);
    }
  };

  const handleRotate = async () => {
    if (!selectedKey) return;

    setSaving(true);
    try {
      // Rotate API key using the proper endpoint
      const response = await api.v1.tenants({ tenantId: selectedKey.tenantId })['api-keys']({ keyId: selectedKey.keyId || selectedKey.id || '' }).rotate.post({
        reason: 'Admin requested rotation',
        sendEmail: true,
      });

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || (response.error as any)?.value?.message || 'Failed to rotate API key';
        toast.error(errorMessage);
      } else if (response.data?.data) {
        const keyData = response.data.data as any;
        const newKey = keyData.key;

        if (newKey) {
          setNewlyCreatedKey(newKey);
          setShowKeyDisplayModal(true);
        }

        toast.success('API key rotated successfully');
        setShowRotateDialog(false);
        setSelectedKey(null);
        fetchApiKeys();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to rotate API key');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedKey) return;

    setSaving(true);
    try {
      // Revoke API key using the proper endpoint
      const response = await api.v1.tenants({ tenantId: selectedKey.tenantId })['api-keys']({ keyId: selectedKey.keyId }).delete(
        {
          reason: 'Admin requested revocation',
        }
      );

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || (response.error as any)?.value?.message || 'Failed to revoke API key';
        toast.error(errorMessage);
      } else {
        toast.success('API key revoked successfully');
        setShowRevokeDialog(false);
        setSelectedKey(null);
        fetchApiKeys();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to revoke API key');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API key copied to clipboard');
  };

  const resetForm = () => {
    setFormData({
      tenantId: '',
      name: '',
      description: '',
      expiresInDays: 365,
      scopes: [],
    });
  };

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    setColumnSort({ key, order });
  };

  const columns: Column<ApiKey>[] = [
    {
      key: 'tenantName',
      header: 'Tenant',
      sortable: true,
      accessor: (key) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {(key.tenantName || key.tenantId).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{key.tenantName || key.tenantId}</p>
            <p className="text-xs text-muted-foreground">ID: {key.tenantId}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'keyPrefix',
      header: 'API Key',
      sortable: true,
      accessor: (key) => (
        <div className="flex items-center gap-2">
          <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
            {key.maskedKey || `${key.keyPrefix}****`}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleCopy(key.maskedKey || `${key.keyPrefix}****`)}
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
    {
      key: 'keyName',
      header: 'Name',
      sortable: true,
      accessor: (key) => (
        <span className="font-medium">{key.keyName || '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (key) => <StatusBadge status={key.status} />,
    },
    {
      key: 'usageCount',
      header: 'API Calls',
      sortable: true,
      accessor: (key) => (
        <span className="font-medium">{(key.usageCount || key.callCount || 0).toLocaleString()}</span>
      ),
    },
    {
      key: 'lastUsedAt',
      header: 'Last Used',
      sortable: true,
      accessor: (key) => (
        <span className="text-sm text-muted-foreground">
          {(key.lastUsedAt || key.lastUsed)
            ? formatDistanceToNow(new Date(key.lastUsedAt || key.lastUsed || 0), { addSuffix: true })
            : 'Never'
          }
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      accessor: (key) => (
        <span className="text-sm text-muted-foreground">
          {new Date(key.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const rowActions = (key: ApiKey) => (
    <>
      <DropdownMenuItem onClick={() => router.push(`/admin/tenants/${key.tenantId}`)}>
        <Building2 className="w-4 h-4 mr-2" />
        View Tenant
      </DropdownMenuItem>
      {key.status?.toLowerCase() === 'active' && (
        <>
          <DropdownMenuItem
            onClick={() => {
              setSelectedKey(key);
              setShowRotateDialog(true);
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Rotate Key
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setSelectedKey(key);
              setShowRevokeDialog(true);
            }}
            className="text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Revoke Key
          </DropdownMenuItem>
        </>
      )}
    </>
  );

  const stats = {
    total: allKeys.length,
    active: allKeys.filter(k => k.status?.toLowerCase() === 'active').length,
    revoked: allKeys.filter(k => k.status?.toLowerCase() === 'revoked').length,
    expired: allKeys.filter(k => k.status?.toLowerCase() === 'expired').length,
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">API Key Management</h1>
            <p className="page-subtitle">Manage tenant API keys and access</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="rounded-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create API Key
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Key className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total API Keys</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-success">{stats.active}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.revoked}</p>
                  <p className="text-sm text-muted-foreground">Revoked</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted/10 flex items-center justify-center">
                  <Key className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.expired}</p>
                  <p className="text-sm text-muted-foreground">Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
          data={filteredKeys.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
          columns={columns}
          searchPlaceholder="Search by tenant name, ID, or key..."
          filters={apiKeyFilters}
          rowActions={rowActions}
          selectable
          isLoading={isLoading}
          currentPage={page}
          totalItems={filteredKeys.length}
          onPageChange={setPage}
          onSearch={setSearchQuery}
          onFilterChange={setFilters}
          onSort={handleSort}
          emptyMessage="No API keys found. Click 'Create API Key' to get started."
        />
      </div>

      {/* Create API Key Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for a tenant. The key will be shown only once after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-tenantId">Tenant *</Label>
              <Select
                value={formData.tenantId}
                onValueChange={(value) => setFormData({ ...formData, tenantId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.tenantId || tenant.id || tenant._id} value={tenant.tenantId || tenant.id || tenant._id}>
                      {tenant.businessName} ({tenant.tenantId || tenant.id || tenant._id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name">API Key Name *</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Production API Key"
              />
            </div>
            {/*  <div className="space-y-2">
              <Label htmlFor="create-description">Description (Optional)</Label>
              <Input
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description for this API key"
              />
            </div> */}
            <div className="space-y-2">
              <Label htmlFor="create-expiresInDays">Expires In (Days)</Label>
              <Input
                id="create-expiresInDays"
                type="number"
                min={1}
                max={3650}
                value={formData.expiresInDays}
                onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) || 365 })}
              />
              <p className="text-xs text-muted-foreground">Leave empty for no expiration</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateModal(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving || !formData.tenantId || !formData.name}>
              {saving ? 'Creating...' : 'Create API Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Display New API Key Modal */}
      <Dialog open={showKeyDisplayModal} onOpenChange={setShowKeyDisplayModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Your API key has been generated. Copy it now - you won't be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                  {newlyCreatedKey}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(newlyCreatedKey)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm text-warning-foreground">
                <p className="font-medium mb-1">Important Security Notice</p>
                <p>This is the only time you'll be able to see the full API key. Make sure to copy and store it securely.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setShowKeyDisplayModal(false);
              setNewlyCreatedKey('');
            }}>
              I've Copied the Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate API Key Dialog */}
      <AlertDialog open={showRotateDialog} onOpenChange={setShowRotateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rotate the API key for <strong>{selectedKey?.tenantName || selectedKey?.tenantId}</strong>?
              The old key will be invalidated and a new key will be generated. You'll only see the new key once.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedKey(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRotate}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              disabled={saving}
            >
              {saving ? 'Rotating...' : 'Rotate Key'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke API Key Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke the API key for <strong>{selectedKey?.tenantName || selectedKey?.tenantId}</strong>?
              This action cannot be undone and the key will immediately stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedKey(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? 'Revoking...' : 'Revoke Key'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
