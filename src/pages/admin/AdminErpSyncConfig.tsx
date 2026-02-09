'use client'

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Eye, Edit, Trash2, Power, Building2, Server, ArrowLeft, Settings, CheckCircle2, XCircle } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SchemaSourceType } from './AdminErpSupport';
import { X, Trash2 as TrashIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

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
    triggerEvents?: string[];
  };
}

const ERP_OPTIONS = Object.values(SchemaSourceType).filter(
  (erp) => !erp.includes('UBL') && !erp.includes('PEPPOL') && erp !== 'CUSTOM'
);

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

const AUTH_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api-key', label: 'API Key' },
  { value: 'oauth2', label: 'OAuth 2.0' },
] as const;

const TRIGGER_EVENTS = [
  'invoice.validated',
  'invoice.signed',
  'invoice.transmitted',
  'invoice.received',
  'invoice.acknowledged',
] as const;

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

  // Form states
  const [formData, setFormData] = useState<{
    tenantId: string;
    erpType: string;
    name: string;
    description: string;
    enabled: boolean;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    baseUrl: string;
    endpoint: string;
    headers: Record<string, string>;
    queryParams: Record<string, string>;
    bodyTemplate: string;
    authentication: {
      type: 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2';
      token: string;
      username: string;
      password: string;
      apiKeyName: string;
      apiKeyValue: string;
      apiKeyLocation: 'header' | 'query';
    };
    timeout: number;
    retryConfig: {
      maxRetries: number;
      retryDelay: number;
      retryOn: number[];
    };
    responseMapping: Record<string, string>;
    triggerEvents: string[];
  }>({
    tenantId: '',
    erpType: '',
    name: '',
    description: '',
    enabled: true,
    method: 'POST',
    baseUrl: '',
    endpoint: '',
    headers: {},
    queryParams: {},
    bodyTemplate: '',
    authentication: {
      type: 'none',
      token: '',
      username: '',
      password: '',
      apiKeyName: '',
      apiKeyValue: '',
      apiKeyLocation: 'header',
    },
    timeout: 30000,
    retryConfig: {
      maxRetries: 3,
      retryDelay: 1000,
      retryOn: [500, 502, 503, 504],
    },
    responseMapping: {},
    triggerEvents: [],
  });

  // Helper states for key-value editors
  const [headersEntries, setHeadersEntries] = useState<Array<{ key: string; value: string }>>([]);
  const [queryParamsEntries, setQueryParamsEntries] = useState<Array<{ key: string; value: string }>>([]);
  const [responseMappingEntries, setResponseMappingEntries] = useState<Array<{ key: string; value: string }>>([]);

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
                triggerEvents: syncConfig.triggerEvents,
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

  const handleCreate = async () => {
    if (!formData.tenantId || !formData.erpType || !formData.name || !formData.baseUrl || !formData.endpoint) {
      toast.error('Please fill in all required fields (Tenant, ERP Type, Name, Base URL, Endpoint)');
      return;
    }

    if (formData.name.length < 3 || formData.name.length > 100) {
      toast.error('Name must be between 3 and 100 characters');
      return;
    }

    if (formData.description && formData.description.length > 500) {
      toast.error('Description must be less than 500 characters');
      return;
    }

    setSaving(true);
    try {
      // Build authentication object based on type
      let finalAuth: any = undefined;
      if (formData.authentication.type !== 'none') {
        const auth: any = { type: formData.authentication.type };
        if (formData.authentication.type === 'bearer' && formData.authentication.token) {
          auth.token = formData.authentication.token;
        } else if (formData.authentication.type === 'basic') {
          if (formData.authentication.username) auth.username = formData.authentication.username;
          if (formData.authentication.password) auth.password = formData.authentication.password;
        } else if (formData.authentication.type === 'api-key') {
          if (formData.authentication.apiKeyName) auth.apiKeyName = formData.authentication.apiKeyName;
          if (formData.authentication.apiKeyValue) auth.apiKeyValue = formData.authentication.apiKeyValue;
          auth.apiKeyLocation = formData.authentication.apiKeyLocation;
        }
        finalAuth = auth;
      }

      // Build sync configuration
      const syncConfig = {
        name: formData.name,
        description: formData.description || undefined,
        enabled: formData.enabled,
        method: formData.method,
        baseUrl: formData.baseUrl,
        endpoint: formData.endpoint,
        headers: Object.keys(entriesToObject(headersEntries)).length > 0 ? entriesToObject(headersEntries) : undefined,
        queryParams: Object.keys(entriesToObject(queryParamsEntries)).length > 0 ? entriesToObject(queryParamsEntries) : undefined,
        bodyTemplate: formData.bodyTemplate || undefined,
        authentication: finalAuth,
        timeout: formData.timeout,
        retryConfig: {
          maxRetries: formData.retryConfig.maxRetries,
          retryDelay: formData.retryConfig.retryDelay,
          retryOn: formData.retryConfig.retryOn,
        },
        responseMapping: Object.keys(entriesToObject(responseMappingEntries)).length > 0 ? entriesToObject(responseMappingEntries) : undefined,
        triggerEvents: formData.triggerEvents.length > 0 ? formData.triggerEvents : undefined,
      };

      // Update tenant with ERP sync configuration
      const response = await api.v1.tenants[':tenantId'].patch({
        params: { tenantId: formData.tenantId },
        body: {
          erpSystem: formData.erpType as any,
          config: {
            erpSyncConfig: syncConfig,
          },
        },
      });

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Failed to create ERP sync configuration';
        toast.error(errorMessage);
      } else if (response.data?.data) {
        toast.success('ERP sync configuration created successfully');
        setShowConfigModal(false);
        resetForm();
        setSelectedConfig(null);
        setIsEditMode(false);
        fetchConfigs();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create ERP sync configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedConfig) return;

    if (!formData.name || !formData.baseUrl || !formData.endpoint) {
      toast.error('Please fill in all required fields (Name, Base URL, Endpoint)');
      return;
    }

    if (formData.name.length < 3 || formData.name.length > 100) {
      toast.error('Name must be between 3 and 100 characters');
      return;
    }

    if (formData.description && formData.description.length > 500) {
      toast.error('Description must be less than 500 characters');
      return;
    }

    setSaving(true);
    try {
      // Build authentication object based on type
      let finalAuth: any = undefined;
      if (formData.authentication.type !== 'none') {
        const auth: any = { type: formData.authentication.type };
        if (formData.authentication.type === 'bearer' && formData.authentication.token) {
          auth.token = formData.authentication.token;
        } else if (formData.authentication.type === 'basic') {
          if (formData.authentication.username) auth.username = formData.authentication.username;
          if (formData.authentication.password) auth.password = formData.authentication.password;
        } else if (formData.authentication.type === 'api-key') {
          if (formData.authentication.apiKeyName) auth.apiKeyName = formData.authentication.apiKeyName;
          if (formData.authentication.apiKeyValue) auth.apiKeyValue = formData.authentication.apiKeyValue;
          auth.apiKeyLocation = formData.authentication.apiKeyLocation;
        }
        finalAuth = auth;
      }

      // Build sync configuration
      const syncConfig = {
        name: formData.name,
        description: formData.description || undefined,
        enabled: formData.enabled,
        method: formData.method,
        baseUrl: formData.baseUrl,
        endpoint: formData.endpoint,
        headers: Object.keys(entriesToObject(headersEntries)).length > 0 ? entriesToObject(headersEntries) : undefined,
        queryParams: Object.keys(entriesToObject(queryParamsEntries)).length > 0 ? entriesToObject(queryParamsEntries) : undefined,
        bodyTemplate: formData.bodyTemplate || undefined,
        authentication: finalAuth,
        timeout: formData.timeout,
        retryConfig: {
          maxRetries: formData.retryConfig.maxRetries,
          retryDelay: formData.retryConfig.retryDelay,
          retryOn: formData.retryConfig.retryOn,
        },
        responseMapping: Object.keys(entriesToObject(responseMappingEntries)).length > 0 ? entriesToObject(responseMappingEntries) : undefined,
        triggerEvents: formData.triggerEvents.length > 0 ? formData.triggerEvents : undefined,
      };

      const response = await api.v1.tenants[':tenantId'].patch({
        params: { tenantId: selectedConfig.tenantId },
        body: {
          erpSystem: formData.erpType as any,
          config: {
            erpSyncConfig: syncConfig,
          },
        },
      });

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Failed to update ERP sync configuration';
        toast.error(errorMessage);
      } else if (response.data?.data) {
        toast.success('ERP sync configuration updated successfully');
        setShowConfigModal(false);
        resetForm();
        setSelectedConfig(null);
        setIsEditMode(false);
        fetchConfigs();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update ERP sync configuration');
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

      const response = await api.v1.tenants[':tenantId'].patch({
        params: { tenantId: selectedConfig.tenantId },
        body: {
          config: {
            erpSyncConfig: updatedSyncConfig,
          },
        },
      });

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
      const response = await api.v1.tenants[':tenantId'].patch({
        params: { tenantId: selectedConfig.tenantId },
        body: {
          config: {
            erpSyncConfig: undefined,
          },
        },
      });

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

  // Helper function to convert object to key-value pairs
  const objectToEntries = (obj: Record<string, string> | undefined): Array<{ key: string; value: string }> => {
    if (!obj) return [];
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  };

  // Helper function to convert key-value pairs to object
  const entriesToObject = (entries: Array<{ key: string; value: string }>): Record<string, string> => {
    const obj: Record<string, string> = {};
    entries.forEach(({ key, value }) => {
      if (key.trim()) {
        obj[key.trim()] = value;
      }
    });
    return obj;
  };

  const resetForm = () => {
    setFormData({
      tenantId: '',
      erpType: '',
      name: '',
      description: '',
      enabled: true,
      method: 'POST',
      baseUrl: '',
      endpoint: '',
      headers: {},
      queryParams: {},
      bodyTemplate: '',
      authentication: {
        type: 'none',
        token: '',
        username: '',
        password: '',
        apiKeyName: '',
        apiKeyValue: '',
        apiKeyLocation: 'header',
      },
      timeout: 30000,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        retryOn: [500, 502, 503, 504],
      },
      responseMapping: {},
      triggerEvents: [],
    });
    setHeadersEntries([]);
    setQueryParamsEntries([]);
    setResponseMappingEntries([]);
  };

  const openConfigModal = (config?: ErpSyncConfig) => {
    if (config) {
      setSelectedConfig(config);
      setIsEditMode(true);
      const syncConfig = config.syncConfig || {} as ErpSyncConfig['syncConfig'];
      setFormData({
        tenantId: config.tenantId,
        erpType: config.erpType,
        name: syncConfig.name || '',
        description: syncConfig.description || '',
        enabled: syncConfig.enabled !== false,
        method: syncConfig.method || 'POST',
        baseUrl: syncConfig.baseUrl || '',
        endpoint: syncConfig.endpoint || '',
        headers: syncConfig.headers || {},
        queryParams: syncConfig.queryParams || {},
        bodyTemplate: syncConfig.bodyTemplate || '',
        authentication: {
          type: (syncConfig.authentication?.type || 'none') as 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2',
          token: syncConfig.authentication?.token || '',
          username: syncConfig.authentication?.username || '',
          password: syncConfig.authentication?.password || '',
          apiKeyName: syncConfig.authentication?.apiKeyName || '',
          apiKeyValue: syncConfig.authentication?.apiKeyValue || '',
          apiKeyLocation: (syncConfig.authentication?.apiKeyLocation || 'header') as 'header' | 'query',
        },
        timeout: syncConfig.timeout || 30000,
        retryConfig: {
          maxRetries: syncConfig.retryConfig?.maxRetries || 3,
          retryDelay: syncConfig.retryConfig?.retryDelay || 1000,
          retryOn: syncConfig.retryConfig?.retryOn || [500, 502, 503, 504],
        },
        responseMapping: syncConfig.responseMapping || {},
        triggerEvents: syncConfig.triggerEvents || [],
      });
      setHeadersEntries(objectToEntries(syncConfig.headers));
      setQueryParamsEntries(objectToEntries(syncConfig.queryParams));
      setResponseMappingEntries(objectToEntries(syncConfig.responseMapping));
    } else {
      setSelectedConfig(null);
      setIsEditMode(false);
      resetForm();
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
          {config.erpType}
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
          resetForm();
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
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="request">Request</TabsTrigger>
              <TabsTrigger value="auth">Authentication</TabsTrigger>
              <TabsTrigger value="retry">Retry</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tenantId">Tenant {!isEditMode && '*'}</Label>
                  {isEditMode ? (
                    <Input
                      id="tenantId"
                      value={selectedConfig?.tenantName || selectedConfig?.tenantId || ''}
                      disabled
                    />
                  ) : (
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
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="erpType">ERP System *</Label>
                  <Select
                    value={formData.erpType}
                    onValueChange={(value) => setFormData({ ...formData, erpType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ERP system" />
                    </SelectTrigger>
                    <SelectContent>
                      {ERP_OPTIONS.map((erp) => (
                        <SelectItem key={erp} value={erp}>
                          {erp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Configuration Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Invoice Sync to SAP"
                  minLength={3}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">3-100 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Sync validated invoices to SAP Business One"
                  maxLength={500}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Max 500 characters</p>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">Enabled</Label>
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
              </div>
            </TabsContent>

            <TabsContent value="request" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="method">HTTP Method *</Label>
                  <Select
                    value={formData.method}
                    onValueChange={(value: any) => setFormData({ ...formData, method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HTTP_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeout">Timeout (ms) *</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min={1000}
                    max={300000}
                    value={formData.timeout}
                    onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) || 30000 })}
                  />
                  <p className="text-xs text-muted-foreground">1000-300000 ms</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseUrl">Base URL *</Label>
                <Input
                  id="baseUrl"
                  type="url"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  placeholder="https://erp.example.com/api"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endpoint">Endpoint *</Label>
                <Input
                  id="endpoint"
                  value={formData.endpoint}
                  onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                  placeholder="/invoices"
                />
              </div>
              <div className="space-y-2">
                <Label>Headers</Label>
                <div className="space-y-2">
                  {headersEntries.map((entry, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Header name"
                        value={entry.key}
                        onChange={(e) => {
                          const newEntries = [...headersEntries];
                          newEntries[index].key = e.target.value;
                          setHeadersEntries(newEntries);
                        }}
                      />
                      <Input
                        placeholder="Header value"
                        value={entry.value}
                        onChange={(e) => {
                          const newEntries = [...headersEntries];
                          newEntries[index].value = e.target.value;
                          setHeadersEntries(newEntries);
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setHeadersEntries(headersEntries.filter((_, i) => i !== index))}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setHeadersEntries([...headersEntries, { key: '', value: '' }])}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Header
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Query Parameters</Label>
                <div className="space-y-2">
                  {queryParamsEntries.map((entry, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Parameter name"
                        value={entry.key}
                        onChange={(e) => {
                          const newEntries = [...queryParamsEntries];
                          newEntries[index].key = e.target.value;
                          setQueryParamsEntries(newEntries);
                        }}
                      />
                      <Input
                        placeholder="Parameter value"
                        value={entry.value}
                        onChange={(e) => {
                          const newEntries = [...queryParamsEntries];
                          newEntries[index].value = e.target.value;
                          setQueryParamsEntries(newEntries);
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setQueryParamsEntries(queryParamsEntries.filter((_, i) => i !== index))}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQueryParamsEntries([...queryParamsEntries, { key: '', value: '' }])}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Query Parameter
                  </Button>
                </div>
              </div>
              {['POST', 'PUT', 'PATCH'].includes(formData.method) && (
                <div className="space-y-2">
                  <Label htmlFor="bodyTemplate">Body Template</Label>
                  <Textarea
                    id="bodyTemplate"
                    value={formData.bodyTemplate}
                    onChange={(e) => setFormData({ ...formData, bodyTemplate: e.target.value })}
                    placeholder='{"invoice": {{"invoice"}}, "status": "{{status}}"}'
                    rows={5}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Use {'{{'}variable{'}}'} for dynamic values</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="auth" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="authType">Authentication Type *</Label>
                <Select
                  value={formData.authentication.type}
                  onValueChange={(value: any) => setFormData({ 
                    ...formData, 
                    authentication: { ...formData.authentication, type: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUTH_TYPES.map((auth) => (
                      <SelectItem key={auth.value} value={auth.value}>
                        {auth.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {formData.authentication.type === 'bearer' && (
                <div className="space-y-2">
                  <Label htmlFor="bearerToken">Bearer Token *</Label>
                  <Input
                    id="bearerToken"
                    type="password"
                    value={formData.authentication.token}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      authentication: { ...formData.authentication, token: e.target.value }
                    })}
                    placeholder="Enter bearer token"
                  />
                </div>
              )}

              {(formData.authentication.type as string) === 'basic' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={formData.authentication.username}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        authentication: { ...formData.authentication, username: e.target.value }
                      })}
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.authentication.password}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        authentication: { ...formData.authentication, password: e.target.value }
                      })}
                      placeholder="Enter password"
                    />
                  </div>
                </div>
              )}

              {(formData.authentication.type as string) === 'api-key' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKeyName">API Key Name *</Label>
                    <Input
                      id="apiKeyName"
                      value={formData.authentication.apiKeyName}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        authentication: { ...formData.authentication, apiKeyName: e.target.value }
                      })}
                      placeholder="e.g., X-API-Key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiKeyValue">API Key Value *</Label>
                    <Input
                      id="apiKeyValue"
                      type="password"
                      value={formData.authentication.apiKeyValue}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        authentication: { ...formData.authentication, apiKeyValue: e.target.value }
                      })}
                      placeholder="Enter API key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiKeyLocation">API Key Location *</Label>
                    <Select
                      value={formData.authentication.apiKeyLocation}
                      onValueChange={(value: any) => setFormData({ 
                        ...formData, 
                        authentication: { ...formData.authentication, apiKeyLocation: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="header">Header</SelectItem>
                        <SelectItem value="query">Query Parameter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="retry" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxRetries">Max Retries *</Label>
                  <Input
                    id="maxRetries"
                    type="number"
                    min={0}
                    max={5}
                    value={formData.retryConfig.maxRetries}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      retryConfig: { ...formData.retryConfig, maxRetries: parseInt(e.target.value) || 3 }
                    })}
                  />
                  <p className="text-xs text-muted-foreground">0-5 retries</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retryDelay">Retry Delay (ms) *</Label>
                  <Input
                    id="retryDelay"
                    type="number"
                    min={100}
                    max={10000}
                    value={formData.retryConfig.retryDelay}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      retryConfig: { ...formData.retryConfig, retryDelay: parseInt(e.target.value) || 1000 }
                    })}
                  />
                  <p className="text-xs text-muted-foreground">100-10000 ms</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Retry On Status Codes</Label>
                <div className="flex flex-wrap gap-2">
                  {[500, 502, 503, 504].map((code) => (
                    <div key={code} className="flex items-center space-x-2">
                      <Checkbox
                        id={`retry-${code}`}
                        checked={formData.retryConfig.retryOn.includes(code)}
                        onCheckedChange={(checked) => {
                          const newRetryOn = checked
                            ? [...formData.retryConfig.retryOn, code]
                            : formData.retryConfig.retryOn.filter(c => c !== code);
                          setFormData({ 
                            ...formData, 
                            retryConfig: { ...formData.retryConfig, retryOn: newRetryOn }
                          });
                        }}
                      />
                      <Label htmlFor={`retry-${code}`} className="cursor-pointer">{code}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Response Mapping</Label>
                <div className="space-y-2">
                  {responseMappingEntries.map((entry, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Response field path"
                        value={entry.key}
                        onChange={(e) => {
                          const newEntries = [...responseMappingEntries];
                          newEntries[index].key = e.target.value;
                          setResponseMappingEntries(newEntries);
                        }}
                      />
                      <Input
                        placeholder="Map to field"
                        value={entry.value}
                        onChange={(e) => {
                          const newEntries = [...responseMappingEntries];
                          newEntries[index].value = e.target.value;
                          setResponseMappingEntries(newEntries);
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setResponseMappingEntries(responseMappingEntries.filter((_, i) => i !== index))}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setResponseMappingEntries([...responseMappingEntries, { key: '', value: '' }])}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Mapping
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">e.g., response.data.invoiceId → invoiceId</p>
              </div>
              <div className="space-y-2">
                <Label>Trigger Events</Label>
                <div className="space-y-2">
                  {TRIGGER_EVENTS.map((event) => (
                    <div key={event} className="flex items-center space-x-2">
                      <Checkbox
                        id={`trigger-${event}`}
                        checked={formData.triggerEvents.includes(event)}
                        onCheckedChange={(checked) => {
                          const newEvents = checked
                            ? [...formData.triggerEvents, event]
                            : formData.triggerEvents.filter(e => e !== event);
                          setFormData({ ...formData, triggerEvents: newEvents });
                        }}
                      />
                      <Label htmlFor={`trigger-${event}`} className="cursor-pointer font-mono text-sm">
                        {event}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowConfigModal(false);
              resetForm();
              setSelectedConfig(null);
              setIsEditMode(false);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={isEditMode ? handleUpdate : handleCreate} 
              disabled={saving || !formData.tenantId || !formData.erpType || !formData.name || !formData.baseUrl || !formData.endpoint}
            >
              {saving ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Configuration' : 'Create Configuration')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Configuration Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl">
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
                      <Badge variant="outline">{selectedConfig.erpType}</Badge>
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
                        {selectedConfig.syncConfig.retryConfig.retryOn && selectedConfig.syncConfig.retryConfig.retryOn.length > 0 && (
                          <div>
                            <span className="text-xs text-muted-foreground">Retry On</span>
                            <div className="flex gap-1 mt-1">
                              {selectedConfig.syncConfig.retryConfig.retryOn.map((code) => (
                                <Badge key={code} variant="outline" className="text-xs">{code}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewModal(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowViewModal(false);
              if (selectedConfig) {
                openConfigModal(selectedConfig);
              }
            }}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Configuration
            </Button>
          </DialogFooter>
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
