'use client'

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Eye, Edit, Trash2, Power, Building2, Webhook, CheckCircle2, XCircle, Copy, Loader2, EyeOff, RefreshCw, AlertCircle } from 'lucide-react';
import { DataTable, Column, FilterOption, StatusBadge, EventMappingEditor, InvoiceIdKeyEditor, getEventLabel, getWorkflowLabel, type EventMapping } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { getAdminApiClient } from '@/lib/api/client';
import { createTenantApi } from '@/lib/api/tenant-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

interface WebhookConfigEntry {
  id: string;
  tenantId: string;
  tenantName?: string;
  webhookUrl?: string;
  webhookEnabled: boolean;
  webhookPath?: string;
  invoiceIdKey?: string;
  eventMappings: EventMapping[];
  tenantStatus: 'active' | 'pending' | 'suspended' | 'inactive' | 'onboarding';
  createdAt: string;
  updatedAt?: string;
}

// ===== Filters =====

const webhookFilters: FilterOption[] = [
  {
    key: 'status',
    label: 'Tenant Status',
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
    label: 'Webhook Status',
    options: [
      { value: 'all', label: 'All' },
      { value: 'enabled', label: 'Enabled' },
      { value: 'disabled', label: 'Disabled' },
    ],
  },
];

// ===== Helper: fetch event routing for a tenant =====

async function fetchTenantEventRouting(api: any, tenantId: string): Promise<EventMapping[]> {
  try {
    const response = await (api as any).v1.admin.tenants[tenantId]['event-routing'].get();
    if (!response.error && response.data?.data?.routes) {
      return (response.data.data.routes as any[]).map((r: any) => ({
        routeId: r.routeId,
        event: typeof r.event === 'object' ? (r.event?.id || '') : (r.event || ''),
        actions: Array.isArray(r.actions)
          ? r.actions.map((a: any) => typeof a === 'object' ? (a?.id || '') : a)
          : [],
        enabled: r.enabled !== false,
        description: r.description || '',
      }));
    }
  } catch {
    // Tenant may not have event routing configured
  }
  return [];
}

// ===== Component =====

export default function AdminWebhookConfig() {
  const api = getAdminApiClient();
  const router = useRouter();
  const [configs, setConfigs] = useState<WebhookConfigEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<WebhookConfigEntry | null>(null);
  const [saving, setSaving] = useState(false);

  // Generate webhook state
  const [isGenerating, setIsGenerating] = useState(false);
  const [invoiceIdKey, setInvoiceIdKey] = useState('');
  const [generatedWebhook, setGeneratedWebhook] = useState<{ webhookUrl: string; webhookSecret: string; invoiceIdKey?: string } | null>(null);
  const [secretVisible, setSecretVisible] = useState(false);

  // Edit form state
  const [editMappings, setEditMappings] = useState<EventMapping[]>([]);

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const response = await api.v1.tenants.get({
        query: {
          page: page,
          limit: 100,
          ...(searchQuery && { search: searchQuery }),
          ...(filters.status && filters.status !== 'all' && { status: filters.status === 'active' ? undefined : filters.status }),
        },
      });

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Failed to fetch webhook configurations';
        toast.error(errorMessage);
      } else if (response.data?.data) {
        const tenantData = response.data.data as any[];
        const mappedConfigs: WebhookConfigEntry[] = await Promise.all(
          tenantData
            .map(async (t: any) => {
              const config = t.config || {};
              const metadata = t.metadata || {};
              const tenantId = t.tenantId || t.id || t._id;

              // Fetch event routing from the new API
              const eventMappings = await fetchTenantEventRouting(api, tenantId);

              return {
                id: t.id || t._id || t.tenantId,
                tenantId,
                tenantName: t.businessName,
                webhookUrl: config.webhookUrl || metadata.webhookUrl || '',
                webhookEnabled: config.webhookEnabled ?? metadata.webhookEnabled ?? false,
                webhookPath: config.webhookPath || metadata.webhookPath || '',
                invoiceIdKey: config.invoiceIdKey || metadata.invoiceIdKey || '',
                eventMappings,
                tenantStatus: t.status || 'inactive',
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
              };
            })
        );

        let filtered = mappedConfigs;
        if (filters.status && filters.status !== 'all') {
          filtered = filtered.filter((c) => {
            const displayStatus = c.tenantStatus === 'onboarding' ? 'active' : c.tenantStatus;
            return displayStatus === filters.status;
          });
        }

        if (filters.enabled && filters.enabled !== 'all') {
          filtered = filtered.filter((c) =>
            filters.enabled === 'enabled' ? c.webhookEnabled : !c.webhookEnabled
          );
        }

        setConfigs(filtered);
        setTotal(filtered.length);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load webhook configurations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [page, searchQuery, filters]);

  // ===== Handlers =====

  const handleEnableDisable = async (enabled: boolean) => {
    if (!selectedConfig) return;

    setSaving(true);
    try {
      const response = await api.v1.tenants[':tenantId'].patch({
        params: { tenantId: selectedConfig.tenantId },
        body: {
          config: {
            webhookEnabled: enabled,
          },
        },
      });

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || `Failed to ${enabled ? 'enable' : 'disable'} webhook`;
        toast.error(errorMessage);
      } else if (response.data?.data) {
        toast.success(`Webhook ${enabled ? 'enabled' : 'disabled'} successfully`);
        setShowEnableDialog(false);
        setShowDisableDialog(false);
        setSelectedConfig(null);
        fetchConfigs();
      }
    } catch (error: any) {
      toast.error(error?.message || `Failed to ${enabled ? 'enable' : 'disable'} webhook`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedConfig) return;

    setSaving(true);
    try {
      // Delete all event routing rules via the new API
      await (api as any).v1.admin.tenants[selectedConfig.tenantId]['event-routing'].delete();

      // Also clear webhook config on the tenant
      const response = await api.v1.tenants[':tenantId'].patch({
        params: { tenantId: selectedConfig.tenantId },
        body: {
          config: {
            webhookUrl: undefined,
            webhookEnabled: undefined,
            webhookPath: undefined,
          },
        },
      });

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Failed to delete webhook configuration';
        toast.error(errorMessage);
      } else {
        toast.success('Webhook configuration deleted successfully');
        setShowDeleteDialog(false);
        setSelectedConfig(null);
        fetchConfigs();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete webhook configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMappings = async () => {
    if (!selectedConfig) return;

    // Validate mappings
    const invalidMappings = editMappings.filter(m => !m.event || m.actions.length === 0);
    if (invalidMappings.length > 0) {
      toast.error('Please fill in all event type and action fields');
      return;
    }

    setSaving(true);
    try {
      const tenantId = selectedConfig.tenantId;
      const routeBase = (api as any).v1.admin.tenants[tenantId]['event-routing'].routes;

      // Separate new routes (no routeId) from existing routes (have routeId)
      const newRoutes = editMappings.filter((m) => !m.routeId);
      const existingRoutes = editMappings.filter((m) => m.routeId);

      const results = await Promise.all([
        // POST new routes
        ...newRoutes.map((m) =>
          routeBase.post({
            event: m.event,
            actions: m.actions,
            enabled: m.enabled,
            ...(m.description && { description: m.description }),
          })
        ),
        // PATCH existing routes
        ...existingRoutes.map((m) =>
          routeBase[m.routeId!].patch({
            event: m.event,
            actions: m.actions,
            enabled: m.enabled,
            ...(m.description && { description: m.description }),
          })
        ),
      ]);

      const hasError = results.some((r: any) => r.error);
      if (hasError) {
        const firstError = results.find((r: any) => r.error);
        const errorMessage = (firstError as any)?.error?.value?.error || 'Failed to save some event routes';
        toast.error(errorMessage);
      } else {
        toast.success('Event routes saved successfully');
        setShowEditModal(false);
        setSelectedConfig(null);
        setEditMappings([]);
        fetchConfigs();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save event routes');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!selectedConfig) return;
    const response = await (api as any).v1.admin.tenants[selectedConfig.tenantId]['event-routing'].routes[routeId].delete();
    if (response.error) {
      const errorMessage = (response.error as any)?.value?.error || 'Failed to delete route';
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
    toast.success('Route removed');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const openGenerateModal = (config: WebhookConfigEntry) => {
    setSelectedConfig(config);
    setGeneratedWebhook(null);
    setInvoiceIdKey(config.invoiceIdKey || '');
    setSecretVisible(false);
    setShowGenerateModal(true);
  };

  const handleGenerateWebhook = async () => {
    if (!selectedConfig) return;
    setIsGenerating(true);
    try {
      const tenantApi = createTenantApi();
      const response = await tenantApi.generateWebhook(selectedConfig.tenantId, invoiceIdKey || undefined);
      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to generate webhook URL');
      } else {
        const data = (response.data as any)?.data;
        if (data?.webhookUrl) {
          setGeneratedWebhook({
            webhookUrl: data.webhookUrl,
            webhookSecret: data.webhookSecret,
            invoiceIdKey: data.invoiceIdKey || invoiceIdKey || undefined,
          });
          setSecretVisible(true);
          setShowRegenerateDialog(false);
          toast.success("Webhook generated. Copy the secret now — it won't be shown again.");
          fetchConfigs();
        }
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate webhook');
    } finally {
      setIsGenerating(false);
    }
  };

  const openViewModal = (config: WebhookConfigEntry) => {
    setSelectedConfig(config);
    setShowViewModal(true);
  };

  const openEditModal = (config: WebhookConfigEntry) => {
    setSelectedConfig(config);
    setEditMappings(config.eventMappings.length > 0
      ? config.eventMappings.map(m => ({ ...m }))
      : [{ event: '', actions: [], enabled: true }]
    );
    setShowEditModal(true);
  };

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    const sorted = [...configs].sort((a, b) => {
      let aVal: any = a[key as keyof WebhookConfigEntry];
      let bVal: any = b[key as keyof WebhookConfigEntry];

      if (key === 'createdAt' || key === 'updatedAt') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else if (key === 'eventMappings') {
        aVal = (a.eventMappings || []).length;
        bVal = (b.eventMappings || []).length;
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
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

  // ===== Columns =====

  const columns: Column<WebhookConfigEntry>[] = [
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
      key: 'webhookUrl',
      header: 'Webhook URL',
      sortable: true,
      accessor: (config) => (
        <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate block">
          {config.webhookUrl || config.webhookPath || 'N/A'}
        </code>
      ),
    },
    {
      key: 'webhookEnabled',
      header: 'Webhook Status',
      sortable: true,
      accessor: (config) => (
        <div className="flex items-center gap-2">
          {config.webhookEnabled ? (
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
      key: 'eventMappings',
      header: 'Event Routes',
      sortable: true,
      accessor: (config) => (
        <Badge variant="outline" className="text-xs">
          {config.eventMappings.length} route{config.eventMappings.length !== 1 ? 's' : ''}
        </Badge>
      ),
    },
    {
      key: 'tenantStatus',
      header: 'Tenant Status',
      sortable: true,
      accessor: (config) => <StatusBadge status={config.tenantStatus === 'onboarding' ? 'active' : config.tenantStatus} />,
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

  // ===== Row Actions =====

  const rowActions = (config: WebhookConfigEntry) => (
    <>
      <DropdownMenuItem onClick={() => openGenerateModal(config)}>
        <Webhook className="w-4 h-4 mr-2" />
        {config.webhookUrl ? 'Regenerate Webhook' : 'Generate Webhook'}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => openViewModal(config)}>
        <Eye className="w-4 h-4 mr-2" />
        View Details
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => router.push(`/admin/tenants/${config.tenantId}`)}>
        <Building2 className="w-4 h-4 mr-2" />
        View Tenant
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => openEditModal(config)}>
        <Edit className="w-4 h-4 mr-2" />
        Edit Event Routing
      </DropdownMenuItem>
      {config.webhookEnabled ? (
        <DropdownMenuItem
          onClick={() => {
            setSelectedConfig(config);
            setShowDisableDialog(true);
          }}
          className="text-warning"
        >
          <Power className="w-4 h-4 mr-2" />
          Disable Webhook
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
          Enable Webhook
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

  // ===== Stats =====

  const stats = {
    total: configs.length,
    enabled: configs.filter(c => c.webhookEnabled).length,
    disabled: configs.filter(c => !c.webhookEnabled).length,
    active: configs.filter(c => c.tenantStatus === 'active' || c.tenantStatus === 'onboarding').length,
  };

  // ===== Render =====

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Webhook Configurations</h1>
            <p className="page-subtitle">Generate webhook URLs and manage event routing for all tenants</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Webhook className="w-5 h-5 text-primary" />
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
          searchPlaceholder="Search by tenant name or ID..."
          filters={webhookFilters}
          rowActions={rowActions}
          selectable
          isLoading={isLoading}
          currentPage={page}
          totalItems={total}
          onPageChange={setPage}
          onSearch={setSearchQuery}
          onFilterChange={setFilters}
          onSort={handleSort}
          emptyMessage="No tenants found."
        />
      </div>

      {/* View Configuration Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl flex flex-col max-h-[85vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Webhook Configuration Details</DialogTitle>
            <DialogDescription>
              View details for {selectedConfig?.tenantName || selectedConfig?.tenantId}
            </DialogDescription>
          </DialogHeader>
          {selectedConfig && (
            <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0 pr-1">
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
                      <StatusBadge status={selectedConfig.tenantStatus === 'onboarding' ? 'active' : selectedConfig.tenantStatus} />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Webhook Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Webhook URL</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
                        {selectedConfig.webhookUrl || 'N/A'}
                      </code>
                    </div>
                    {selectedConfig.webhookPath && (
                      <div>
                        <p className="text-xs text-muted-foreground">Webhook Path</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded block">
                          {selectedConfig.webhookPath}
                        </code>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Webhook Status</p>
                      {selectedConfig.webhookEnabled ? (
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
                  </CardContent>
                </Card>
              </div>

              {/* Event Routing Rules */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Event Routes ({selectedConfig.eventMappings.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedConfig.eventMappings.length > 0 ? (
                    <div className="space-y-2">
                      {selectedConfig.eventMappings.map((mapping, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-3 flex-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {getEventLabel(mapping.event)}
                            </Badge>
                            <span className="text-muted-foreground">→</span>
                            <div className="flex flex-wrap gap-1">
                              {mapping.actions.map((action, ai) => (
                                <Badge key={ai} variant="secondary" className="text-xs">
                                  {getWorkflowLabel(action)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            {mapping.enabled ? (
                              <Badge className="bg-success/10 text-success text-xs">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No event routes configured</p>
                  )}
                </CardContent>
              </Card>

              {/* Timestamps */}
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Created: {new Date(selectedConfig.createdAt).toLocaleString()}</span>
                {selectedConfig.updatedAt && (
                  <span>Updated: {formatDistanceToNow(new Date(selectedConfig.updatedAt), { addSuffix: true })}</span>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setShowViewModal(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowViewModal(false);
              if (selectedConfig) {
                openEditModal(selectedConfig);
              }
            }}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Event Routing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Routing Modal */}
      <Dialog open={showEditModal} onOpenChange={(open) => {
        setShowEditModal(open);
        if (!open) {
          setSelectedConfig(null);
          setEditMappings([]);
        }
      }}>
        <DialogContent className="max-w-3xl flex flex-col max-h-[85vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>Edit Event Routing</DialogTitle>
            <DialogDescription>
              Configure event-to-action routing rules for {selectedConfig?.tenantName || selectedConfig?.tenantId}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 overflow-y-auto flex-1 min-h-0 pr-1">
            <EventMappingEditor
              mappings={editMappings}
              onChange={setEditMappings}
              showSummary={false}
              onDeleteRoute={handleDeleteRoute}
            />
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => {
              setShowEditModal(false);
              setSelectedConfig(null);
              setEditMappings([]);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveMappings}
              disabled={saving || editMappings.length === 0}
            >
              {saving ? 'Saving...' : 'Save Routes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enable Confirmation Dialog */}
      <AlertDialog open={showEnableDialog} onOpenChange={setShowEnableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enable Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to enable the webhook for <strong>{selectedConfig?.tenantName || selectedConfig?.tenantId}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedConfig(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleEnableDisable(true)}
              className="bg-success text-success-foreground hover:bg-success/90"
              disabled={saving}
            >
              {saving ? 'Enabling...' : 'Enable Webhook'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disable Confirmation Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disable the webhook for <strong>{selectedConfig?.tenantName || selectedConfig?.tenantId}</strong>?
              This will stop webhook event processing until re-enabled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedConfig(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleEnableDisable(false)}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              disabled={saving}
            >
              {saving ? 'Disabling...' : 'Disable Webhook'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generate Webhook Modal */}
      <Dialog open={showGenerateModal} onOpenChange={(open) => { setShowGenerateModal(open); if (!open) { setSelectedConfig(null); setGeneratedWebhook(null); setInvoiceIdKey(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="w-5 h-5" />
              {selectedConfig?.webhookUrl ? 'Regenerate' : 'Generate'} Webhook
            </DialogTitle>
            <DialogDescription>
              {selectedConfig?.tenantName || selectedConfig?.tenantId}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Existing URL (no fresh generation yet) */}
            {selectedConfig?.webhookUrl && !generatedWebhook && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Current Webhook URL</Label>
                  <div className="flex items-center gap-2">
                    <Input value={selectedConfig.webhookUrl} readOnly className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(selectedConfig.webhookUrl!, 'Webhook URL')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Webhook Secret</Label>
                  <div className="flex items-center gap-2">
                    <Input value="••••••••••••••••••••••••" readOnly className="font-mono text-xs" type="password" />
                    <Button variant="outline" size="icon" disabled title="Secret is hidden. Regenerate to get a new one.">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Secret is not retrievable. Regenerate to get a new one.</p>
                </div>
              </div>
            )}

            {/* Newly generated result */}
            {generatedWebhook && (
              <div className="space-y-3 p-3 border rounded-lg bg-muted/40">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                  <div className="flex items-center gap-2">
                    <Input value={generatedWebhook.webhookUrl} readOnly className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedWebhook.webhookUrl, 'Webhook URL')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Webhook Secret <span className="text-destructive">(copy now — won't be shown again)</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input value={secretVisible ? generatedWebhook.webhookSecret : '••••••••••••••••'} readOnly className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={() => setSecretVisible(v => !v)}>
                      {secretVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedWebhook.webhookSecret, 'Webhook secret')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {generatedWebhook.invoiceIdKey && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Invoice ID Key</Label>
                    <p className="font-mono text-xs mt-0.5">{generatedWebhook.invoiceIdKey}</p>
                  </div>
                )}
              </div>
            )}

            {/* Invoice ID Key */}
            <div className="pt-1 border-t">
              {selectedConfig?.webhookUrl && !generatedWebhook ? (
                <InvoiceIdKeyEditor
                  initialValue={selectedConfig.invoiceIdKey || ''}
                  onSave={async (key) => {
                    const res = await (api as any).v1.tenants({ tenantId: selectedConfig.tenantId })['invoice-id-key'].put({ invoiceIdKey: key });
                    if (res.error) throw new Error((res.error as any)?.value?.error || 'Failed to update invoice ID key');
                  }}
                  onSaved={(key) => {
                    setSelectedConfig({ ...selectedConfig, invoiceIdKey: key });
                    setInvoiceIdKey(key);
                  }}
                />
              ) : !generatedWebhook ? (
                <div className="space-y-2">
                  <Label htmlFor="gen-invoiceIdKey" className="text-xs text-muted-foreground">
                    Invoice ID Key <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="gen-invoiceIdKey"
                    value={invoiceIdKey}
                    onChange={(e) => setInvoiceIdKey(e.target.value)}
                    placeholder="e.g. invoice.documentId"
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Dot-notation path to the invoice ID field in the webhook payload
                  </p>
                </div>
              ) : null}
            </div>

            {/* Regenerate / Generate action */}
            <div className="space-y-2 pt-1 border-t">
              {selectedConfig?.webhookUrl ? (
                <>
                  <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isGenerating}
                      onClick={() => setShowRegenerateDialog(true)}
                      className="w-full sm:w-auto"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                      Regenerate URL &amp; Secret
                    </Button>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Regenerate Webhook?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                          <div className="text-sm text-muted-foreground space-y-2">
                            <p>This action is <strong>irreversible</strong> and will:</p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              <li>Generate a new webhook URL and secret for <strong>{selectedConfig?.tenantName}</strong></li>
                              <li>Immediately invalidate the existing webhook URL and secret</li>
                              <li>Disconnect any currently connected ERP or external system</li>
                            </ul>
                            <p>You will need to share the new credentials with the tenant.</p>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleGenerateWebhook}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          disabled={isGenerating}
                        >
                          {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Regenerating...</> : 'Yes, Regenerate'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Regenerating will invalidate the previous URL and secret, revoking all configurations tied to them.
                    </AlertDescription>
                  </Alert>
                </>
              ) : (
                <Button onClick={handleGenerateWebhook} disabled={isGenerating} className="w-full sm:w-auto">
                  {isGenerating
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                    : <><Webhook className="mr-2 h-4 w-4" />Generate Webhook URL</>}
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the webhook configuration for <strong>{selectedConfig?.tenantName || selectedConfig?.tenantId}</strong>?
              This will remove all webhook settings and event routes. This action cannot be undone.
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
