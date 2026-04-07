'use client'

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Eye, Edit, Trash2, Power, Building2, Server, CheckCircle2, XCircle } from 'lucide-react';
import { DataTable, Column, FilterOption, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { getAdminApiClient } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useSupportedErps, formatErpName } from '@/hooks/use-supported-erps';
import { ErpSyncForm, ErpSyncPayload, ErpSyncDefaultValues } from '@/components/shared/ErpSyncForm';

interface ErpSyncConfig {
  id: string;
  tenantId: string;
  tenantName?: string;
  erpType: string;
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  enabled: boolean;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt?: string;
  syncConfig?: {
    name: string;
    description?: string;
    enabled: boolean;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    baseUrl: string;
    endpoint: string;
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    bodyTemplate?: string;
    authentication?: {
      type: 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2';
      token?: string;
      username?: string;
      password?: string;
      apiKeyName?: string;
      apiKeyValue?: string;
      apiKeyLocation?: 'header' | 'query';
    };
    timeout?: number;
    retryConfig?: {
      maxRetries: number;
      retryDelay: number;
      retryOn?: number[];
    };
    responseMapping?: Record<string, string>;
  };
}


const erpSyncFilters: FilterOption[] = [
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'all', label: 'All Statuses' },
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
      { value: 'suspended', label: 'Suspended' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
  {
    key: 'enabled',
    label: 'Sync Status',
    options: [
      { value: 'all', label: 'All' },
      { value: 'enabled', label: 'Enabled' },
      { value: 'disabled', label: 'Disabled' },
    ],
  },
];

export default function AdminErpSyncConfig() {
  const api = getAdminApiClient();
  const router = useRouter();
  const { erpOptions } = useSupportedErps({ includeAll: true });
  const ERP_OPTIONS = erpOptions.filter(
    (erp) => !erp.includes('UBL') && !erp.includes('PEPPOL') && erp !== 'CUSTOM'
  );
  const [configs, setConfigs] = useState<ErpSyncConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Modal states
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ErpSyncConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states â€” only admin-specific fields; the rest live in ErpSyncForm
  const [adminTenantId, setAdminTenantId] = useState('');
  const [adminErpType, setAdminErpType] = useState('');
  const [syncDefaultValues, setSyncDefaultValues] = useState<ErpSyncDefaultValues | undefined>();

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      // Fetch all tenants and extract their ERP sync configurations
      const response = await api.v1.tenants.get({
        query: {
          page: page,
          limit: 100, // Get more to show all configs
          ...(searchQuery && { search: searchQuery }),
          ...(filters.status && filters.status !== 'all' && { status: filters.status }),
        },
      });

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Failed to fetch ERP sync configurations';
        toast.error(errorMessage);
      } else if (response.data?.data) {
        const tenantData = response.data.data as any[];
        const mappedConfigs: ErpSyncConfig[] = tenantData
          .filter((t: any) => t.erpSystem || t.config?.erpSystem || t.config?.erpSyncConfig) // Only tenants with ERP systems or sync configs
          .map((t: any) => {
            const syncConfig = t.config?.erpSyncConfig;
            return {
              id: t.id || t._id || t.tenantId,
              tenantId: t.tenantId || t.id || t._id,
              tenantName: t.businessName,
              erpType: t.config?.erpSystem || t.erpSystem || '',
              status: t.status || 'inactive',
              enabled: syncConfig?.enabled !== false,
              lastSyncAt: t.config?.lastSyncAt,
              createdAt: t.createdAt,
              updatedAt: t.updatedAt,
              syncConfig: syncConfig ? {
                name: syncConfig.name,
                description: syncConfig.description,
                enabled: syncConfig.enabled !== false,
                method: syncConfig.method || 'POST',
                baseUrl: syncConfig.baseUrl,
                endpoint: syncConfig.endpoint,
                headers: syncConfig.headers,
                queryParams: syncConfig.queryParams,
                bodyTemplate: syncConfig.bodyTemplate,
                authentication: syncConfig.authentication,
                timeout: syncConfig.timeout,
                retryConfig: syncConfig.retryConfig,
                responseMapping: syncConfig.responseMapping,
              } : undefined,
            };
          });

        // Apply enabled filter
        let filtered = mappedConfigs;
        if (filters.enabled && filters.enabled !== 'all') {
          filtered = mappedConfigs.filter((c) =>
            filters.enabled === 'enabled' ? c.enabled : !c.enabled
          );
        }

        setConfigs(filtered);
        setTotal(filtered.length);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load ERP sync configurations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [page, searchQuery, filters]);

  const handleFormSubmit = async (payload: ErpSyncPayload) => {
    if (!isEditMode && (!adminTenantId || !adminErpType)) {
      toast.error('Please select a tenant and ERP type');
      return;
    }
    setSaving(true);
    try {
      const tenantId = isEditMode ? selectedConfig!.tenantId : adminTenantId;
      const response = await api.v1.tenants({ tenantId })['erp-sync'].put(payload);
      if (response.error) {
        toast.error((response.error as any)?.value?.error || `Failed to ${isEditMode ? 'update' : 'create'} ERP sync configuration`);
      } else if (response.data?.data) {
        toast.success(`ERP sync configuration ${isEditMode ? 'updated' : 'created'} successfully`);
        setShowConfigModal(false);
        setSelectedConfig(null);
        setIsEditMode(false);
        fetchConfigs();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save ERP sync configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleEnableDisable = async (enabled: boolean) => {
    if (!selectedConfig) return;

    setSaving(true);
    try {
      // Get current sync config and update enabled status
      const currentSyncConfig = selectedConfig.syncConfig || {};
      const updatedSyncConfig = {
        ...currentSyncConfig,
        enabled: enabled,
      };

      const response = await api.v1.tenants({ tenantId: selectedConfig.tenantId }).patch({
        config: {
          erpSyncConfig: updatedSyncConfig,
        },
      } as any);

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || `Failed to ${enabled ? 'enable' : 'disable'} ERP sync`;
        toast.error(errorMessage);
      } else if (response.data?.data) {
        toast.success(`ERP sync ${enabled ? 'enabled' : 'disabled'} successfully`);
        setShowEnableDialog(false);
        setShowDisableDialog(false);
        setSelectedConfig(null);
        fetchConfigs();
      }
    } catch (error: any) {
      toast.error(error?.message || `Failed to ${enabled ? 'enable' : 'disable'} ERP sync`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedConfig) return;

    setSaving(true);
    try {
      // Remove ERP sync configuration
      const response = await api.v1.tenants({ tenantId: selectedConfig.tenantId }).patch({
        config: {
          erpSyncConfig: null,
        },
      } as any);

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Failed to delete ERP sync configuration';
        toast.error(errorMessage);
      } else {
        toast.success('ERP sync configuration deleted successfully');
        setShowDeleteDialog(false);
        setSelectedConfig(null);
        fetchConfigs();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete ERP sync configuration');
    } finally {
      setSaving(false);
    }
  };

  const openConfigModal = (config?: ErpSyncConfig) => {
    if (config) {
      setSelectedConfig(config);
      setIsEditMode(true);
      setAdminTenantId(config.tenantId);
      setAdminErpType(config.erpType);
      const s = config.syncConfig;
      setSyncDefaultValues(s ? {
        name: s.name,
        description: s.description,
        enabled: s.enabled !== false,
        method: s.method,
        baseUrl: s.baseUrl,
        endpoint: s.endpoint,
        timeout: s.timeout,
        bodyTemplate: s.bodyTemplate,
        headers: s.headers,
        queryParams: s.queryParams,
        authentication: s.authentication,
        retryConfig: s.retryConfig,
        responseMapping: s.responseMapping,
      } : undefined);
    } else {
      setSelectedConfig(null);
      setIsEditMode(false);
      setAdminTenantId('');
      setAdminErpType('');
      setSyncDefaultValues(undefined);
    }
    setShowConfigModal(true);
  };

  const openViewModal = (config: ErpSyncConfig) => {
    setSelectedConfig(config);
    setShowViewModal(true);
  };

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    const sorted = [...configs].sort((a, b) => {
      let aVal: any = a[key as keyof ErpSyncConfig];
      let bVal: any = b[key as keyof ErpSyncConfig];

      if (key === 'createdAt' || key === 'updatedAt' || key === 'lastSyncAt') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      } else if (typeof aVal === 'boolean') {
        aVal = aVal ? 1 : 0;
        bVal = bVal ? 1 : 0;
      }

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
    setConfigs(sorted);
  };

  const columns: Column<ErpSyncConfig>[] = [
    {
      key: 'tenantName',
      header: 'Tenant',
      sortable: true,
      accessor: (config) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {(config.tenantName || config.tenantId).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{config.tenantName || config.tenantId}</p>
            <p className="text-xs text-muted-foreground">ID: {config.tenantId}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'erpType',
      header: 'ERP System',
      sortable: true,
      accessor: (config) => (
        <Badge variant="outline" className="text-xs">
          {formatErpName(config.erpType)}
        </Badge>
      ),
    },
    {
      key: 'enabled',
      header: 'Sync Status',
      sortable: true,
      accessor: (config) => (
        <div className="flex items-center gap-2">
          {config.enabled ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm text-success font-medium">Enabled</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Disabled</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Configuration Name',
      sortable: true,
      accessor: (config) => (
        <span className="text-sm font-medium">{config.syncConfig?.name || 'N/A'}</span>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      sortable: true,
      accessor: (config) => (
        <Badge variant="outline" className="text-xs">
          {config.syncConfig?.method || 'N/A'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Tenant Status',
      sortable: true,
      accessor: (config) => <StatusBadge status={config.status} />,
    },
    {
      key: 'lastSyncAt',
      header: 'Last Sync',
      sortable: true,
      accessor: (config) => (
        <span className="text-sm text-muted-foreground">
          {config.lastSyncAt
            ? formatDistanceToNow(new Date(config.lastSyncAt), { addSuffix: true })
            : 'Never'
          }
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      accessor: (config) => (
        <span className="text-sm text-muted-foreground">
          {new Date(config.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const rowActions = (config: ErpSyncConfig) => (
    <>
      <DropdownMenuItem onClick={() => openViewModal(config)}>
        <Eye className="w-4 h-4 mr-2" />
        View Details
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => router.push(`/admin/tenants/${config.tenantId}`)}>
        <Building2 className="w-4 h-4 mr-2" />
        View Tenant
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => openConfigModal(config)}>
        <Edit className="w-4 h-4 mr-2" />
        Edit Configuration
      </DropdownMenuItem>
      {config.enabled ? (
        <DropdownMenuItem
          onClick={() => {
            setSelectedConfig(config);
            setShowDisableDialog(true);
          }}
          className="text-warning"
        >
          <Power className="w-4 h-4 mr-2" />
          Disable Sync
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem
          onClick={() => {
            setSelectedConfig(config);
            setShowEnableDialog(true);
          }}
          className="text-success"
        >
          <Power className="w-4 h-4 mr-2" />
          Enable Sync
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onClick={() => {
          setSelectedConfig(config);
          setShowDeleteDialog(true);
        }}
        className="text-destructive"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete Configuration
      </DropdownMenuItem>
    </>
  );

  const stats = {
    total: configs.length,
    enabled: configs.filter(c => c.enabled).length,
    disabled: configs.filter(c => !c.enabled).length,
    active: configs.filter(c => c.status === 'active').length,
  };

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

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">ERP Sync Configurations</h1>
            <p className="page-subtitle">Manage ERP synchronization settings for all tenants</p>
          </div>
          <Button
            onClick={() => openConfigModal()}
            className="rounded-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Configure ERP Sync
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Server className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Configurations</p>
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
                  <p className="text-2xl font-bold text-success">{stats.enabled}</p>
                  <p className="text-sm text-muted-foreground">Enabled</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.disabled}</p>
                  <p className="text-sm text-muted-foreground">Disabled</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-sm text-muted-foreground">Active Tenants</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <DataTable
          data={configs}
          columns={columns}
          searchPlaceholder="Search by tenant name, ID, or ERP type..."
          filters={erpSyncFilters}
          rowActions={rowActions}
          selectable
          isLoading={isLoading}
          currentPage={page}
          totalItems={total}
          onPageChange={setPage}
          onSearch={setSearchQuery}
          onFilterChange={setFilters}
          onSort={handleSort}
          emptyMessage="No ERP sync configurations found. Click 'Configure ERP Sync' to get started."
        />
      </div>

      {/* Unified Create/Edit Configuration Modal */}
      <Dialog open={showConfigModal} onOpenChange={(open) => {
        setShowConfigModal(open);
        if (!open) {
          setAdminTenantId('');
          setAdminErpType('');
          setSyncDefaultValues(undefined);
          setSelectedConfig(null);
          setIsEditMode(false);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit' : 'Create'} ERP Sync Configuration</DialogTitle>
            <DialogDescription>
              {isEditMode
                ? `Update ERP synchronization settings for ${selectedConfig?.tenantName || selectedConfig?.tenantId}`
                : 'Set up ERP synchronization for a tenant. All fields marked with * are required.'
              }
            </DialogDescription>
          </DialogHeader>

          <ErpSyncForm
            defaultValues={syncDefaultValues}
            isSaving={saving}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowConfigModal(false);
              setSelectedConfig(null);
              setIsEditMode(false);
            }}
            submitLabel={isEditMode ? 'Update Configuration' : 'Create Configuration'}
            topSlot={
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tenant {!isEditMode && '*'}</Label>
                  {isEditMode ? (
                    <Input value={selectedConfig?.tenantName || selectedConfig?.tenantId || ''} disabled />
                  ) : (
                    <Select value={adminTenantId} onValueChange={setAdminTenantId}>
                      <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
                      <SelectContent>
                        {tenants.map((tenant) => (
                          <SelectItem key={tenant.tenantId || tenant.id || tenant._id} value={tenant.tenantId || tenant.id || tenant._id}>
                            {tenant.businessName} ({tenant.tenantId || tenant.id || tenant._id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>ERP System *</Label>
                  <Select value={adminErpType} onValueChange={setAdminErpType}>
                    <SelectTrigger><SelectValue placeholder="Select ERP system" /></SelectTrigger>
                    <SelectContent>
                      {ERP_OPTIONS.map((erp) => (
                        <SelectItem key={erp} value={erp}>{formatErpName(erp)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            }
          />
        </DialogContent>
      </Dialog>

      {/* View Configuration Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ERP Sync Configuration Details</DialogTitle>
            <DialogDescription>
              View details for {selectedConfig?.tenantName || selectedConfig?.tenantId}
            </DialogDescription>
          </DialogHeader>
          {selectedConfig && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Tenant Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Tenant Name</p>
                      <p className="font-medium">{selectedConfig.tenantName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tenant ID</p>
                      <p className="font-mono text-sm">{selectedConfig.tenantId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <StatusBadge status={selectedConfig.status} />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">ERP Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">ERP System</p>
                      <Badge variant="outline">{formatErpName(selectedConfig.erpType)}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Sync Status</p>
                      {selectedConfig.enabled ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-success" />
                          <span className="text-sm text-success font-medium">Enabled</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Disabled</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Configuration Name</p>
                      <p className="text-sm font-medium">{selectedConfig.syncConfig?.name || 'N/A'}</p>
                    </div>
                    {selectedConfig.syncConfig?.description && (
                      <div>
                        <p className="text-xs text-muted-foreground">Description</p>
                        <p className="text-sm">{selectedConfig.syncConfig.description}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Method</p>
                      <Badge variant="outline">{selectedConfig.syncConfig?.method || 'N/A'}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
              {selectedConfig.syncConfig && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Sync Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedConfig.syncConfig.baseUrl && (
                      <div>
                        <p className="text-xs text-muted-foreground">Base URL</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded block">{selectedConfig.syncConfig.baseUrl}</code>
                      </div>
                    )}
                    {selectedConfig.syncConfig.endpoint && (
                      <div>
                        <p className="text-xs text-muted-foreground">Endpoint</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded block">{selectedConfig.syncConfig.endpoint}</code>
                      </div>
                    )}
                    {selectedConfig.syncConfig.timeout && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Timeout</span>
                        <span className="text-sm">{selectedConfig.syncConfig.timeout} ms</span>
                      </div>
                    )}
                    {selectedConfig.syncConfig.retryConfig && (
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Max Retries</span>
                          <span className="text-sm">{selectedConfig.syncConfig.retryConfig.maxRetries}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Retry Delay</span>
                          <span className="text-sm">{selectedConfig.syncConfig.retryConfig.retryDelay} ms</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              {selectedConfig.lastSyncAt && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Last Sync</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {formatDistanceToNow(new Date(selectedConfig.lastSyncAt), { addSuffix: true })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(selectedConfig.lastSyncAt).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowViewModal(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowViewModal(false);
              if (selectedConfig) openConfigModal(selectedConfig);
            }}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enable Confirmation Dialog */}
      <AlertDialog open={showEnableDialog} onOpenChange={setShowEnableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enable ERP Sync</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to enable ERP synchronization for <strong>{selectedConfig?.tenantName || selectedConfig?.tenantId}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedConfig(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleEnableDisable(true)}
              className="bg-success text-success-foreground hover:bg-success/90"
              disabled={saving}
            >
              {saving ? 'Enabling...' : 'Enable Sync'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disable Confirmation Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable ERP Sync</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disable ERP synchronization for <strong>{selectedConfig?.tenantName || selectedConfig?.tenantId}</strong>?
              This will stop automatic synchronization until re-enabled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedConfig(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleEnableDisable(false)}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              disabled={saving}
            >
              {saving ? 'Disabling...' : 'Disable Sync'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ERP Sync Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the ERP sync configuration for <strong>{selectedConfig?.tenantName || selectedConfig?.tenantId}</strong>?
              This will remove all sync settings and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedConfig(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Delete Configuration'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
