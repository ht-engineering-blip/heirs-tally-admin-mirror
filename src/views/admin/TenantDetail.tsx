'use client'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePersistedTab } from '@/hooks/use-persisted-tab';
import { ArrowLeft, Edit, Calendar, Clock, Building2, Mail, Phone, Server, Key, Settings, RefreshCw, Webhook, Copy, Loader2, Eye, EyeOff, AlertCircle, Shield, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, InvoiceIdKeyEditor, WebhookExpiryBadge } from '@/components/shared';
import { toast } from 'sonner';
import { getAdminApiClient } from '@/lib/api/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSupportedErps, formatErpName } from '@/hooks/use-supported-erps';
import { SectionLoader } from '@/components/shared/SectionLoader';
import { createTenantApi } from '@/lib/api/tenant-api';

const CREDIT_NOTE_EVENT_TYPE = 'erp.creditnote.issued';

interface Tenant {
  id: string;
  tenantId: string;
  businessName: string;
  tin: string;
  businessRegistrationNumber?: string;
  contactEmail: string;
  contactPhone: string;
  erpSystem: string;
  status: 'active' | 'suspended' | 'inactive' | 'onboarding';
  createdAt: string;
  updatedAt?: string;
  config?: {
    erpSystem: string;
    features?: {
      autoFix?: boolean;
      maxRetries?: number;
      qrCodeGeneration?: boolean;
    };
    limits?: {
      monthlyInvoiceLimit?: number;
      apiRateLimit?: number;
    };
    webhookUrl?: string;
    webhookEnabled?: boolean;
  };
  onboarding?: {
    status: 'active' | 'pending' | 'in_progress' | 'testing' | 'rejected';
    progress?: number;
    notes?: string;
    rejectionReason?: string;
    approvedAt?: string;
  };
}

interface WebhookStatus {
  configured: boolean;
  webhookUrl: string | null;
  webhookPath: string | null;
  webhookEnabled: boolean;
  invoiceIdKey: string | null;
  webhookAuthMode: 'auto' | 'hmac' | 'static_secret' | 'secret_url';
  lifespan: string | null;
  expiresAt: string | null;
  isExpired: boolean;
  hasSecret: boolean;
  remainingDays: number | null;
}

const LIFESPAN_OPTIONS = [
  { value: '30_DAYS', label: '30 Days' },
  { value: '90_DAYS', label: '90 Days' },
  { value: '180_DAYS', label: '180 Days' },
  { value: '1_YEAR', label: '1 Year' },
  { value: 'NO_EXPIRATION', label: 'No Expiration' },
];

const AUTH_MODE_OPTIONS = [
  { value: 'auto', label: 'Auto (Recommended)' },
  { value: 'hmac', label: 'HMAC Signature' },
  { value: 'static_secret', label: 'Legacy Static Secret' },
  { value: 'secret_url', label: 'Secret URL' },
];

export default function TenantDetail() {
  const params = useParams();
  const router = useRouter();
  const api = getAdminApiClient();
  const [detailTab, setDetailTab] = usePersistedTab('overview');
  const tenantId = params?.tenantId as string;
  const { erpOptions } = useSupportedErps({ includeAll: true });
  const ERP_OPTIONS = erpOptions.filter(
    (erp) => !erp.includes('UBL') && !erp.includes('PEPPOL') && erp !== 'CUSTOM'
  );

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedWebhook, setGeneratedWebhook] = useState<{
    webhookUrl: string;
    webhookSecret: string;
  } | null>(null);
  const [secretVisible, setSecretVisible] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [webhookStatusLoading, setWebhookStatusLoading] = useState(true);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedLifespan, setSelectedLifespan] = useState('NO_EXPIRATION');
  const [selectedAuthMode, setSelectedAuthMode] = useState('auto');
  const [keyConfig, setKeyConfig] = useState({
    invoiceIdKey: '',
    creditNoteIdKey: '',
    creditNoteReferenceIdKey: '',
  });
  const [keyConfigLoading, setKeyConfigLoading] = useState(true);
  const [showFirsCredentialsModal, setShowFirsCredentialsModal] = useState(false);
  const [firsCredentialsSaving, setFirsCredentialsSaving] = useState(false);
  const [firsCredentialsForm, setFirsCredentialsForm] = useState({ certificate: '', publicKey: '' });

  const [formData, setFormData] = useState({
    businessName: '',
    contactEmail: '',
    contactPhone: '',
    erpSystem: '',
    webhookUrl: '',
    webhookEnabled: false,
    autoFix: false,
    maxRetries: 3,
    qrCodeGeneration: false,
    monthlyInvoiceLimit: undefined as number | undefined,
    apiRateLimit: undefined as number | undefined,
  });

  const [onboardingData, setOnboardingData] = useState({
    status: 'in_progress' as 'active' | 'pending' | 'in_progress' | 'testing' | 'rejected',
    notes: '',
    rejectionReason: '',
  });

  const fetchTenant = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const response = await api.v1.tenants({tenantId: tenantId}).get();

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Failed to fetch tenant';
        toast.error(errorMessage);
        router.push('/admin/tenants/all');
      } else if (response.data?.data) {
        const data = response.data.data as any;
        const tenantData: Tenant = {
          id: data.id || data._id || data.tenantId,
          tenantId: data.tenantId || data.id || data._id,
          businessName: data.businessName,
          tin: data.tin,
          businessRegistrationNumber: data.businessRegistrationNumber,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          erpSystem: data.config?.erpSystem || data.erpSystem || '',
          status: data.status || 'inactive',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          config: data.config,
          onboarding: data.onboarding,
        };
        setTenant(tenantData);
        
        // Populate form data
        setFormData({
          businessName: tenantData.businessName,
          contactEmail: tenantData.contactEmail,
          contactPhone: tenantData.contactPhone,
          erpSystem: tenantData.config?.erpSystem! || tenantData.erpSystem,
          webhookUrl: tenantData.config?.webhookUrl || '',
          webhookEnabled: tenantData.config?.webhookEnabled || false,
          autoFix: tenantData.config?.features?.autoFix || false,
          maxRetries: tenantData.config?.features?.maxRetries || 3,
          qrCodeGeneration: tenantData.config?.features?.qrCodeGeneration || false,
          monthlyInvoiceLimit: tenantData.config?.limits?.monthlyInvoiceLimit,
          apiRateLimit: tenantData.config?.limits?.apiRateLimit,
        });
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to fetch tenant');
      router.push('/admin/tenants/all');
    } finally {
      setLoading(false);
    }
  };

  const fetchKeyConfig = async () => {
    if (!tenantId) return;
    setKeyConfigLoading(true);
    try {
      const response = await (api as any).v1.tenants({ tenantId })['key-config'].get();
      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Failed to load invoice ID key configuration';
        console.error('getKeyConfig failed:', response.error);
        toast.error(errorMessage);
      } else if (response.data?.data) {
        const data = response.data.data as any;
        setKeyConfig({
          invoiceIdKey: data.invoiceIdKey || '',
          creditNoteIdKey: data.idKeyMap?.[CREDIT_NOTE_EVENT_TYPE] || '',
          creditNoteReferenceIdKey: data.referenceIdKeyMap?.[CREDIT_NOTE_EVENT_TYPE] || '',
        });
      }
    } catch (error: any) {
      console.error('getKeyConfig threw:', error);
      toast.error(error?.message || 'Failed to load invoice ID key configuration');
    } finally {
      setKeyConfigLoading(false);
    }
  };

  const fetchWebhookStatus = async () => {
    if (!tenantId) return;
    setWebhookStatusLoading(true);
    try {
      const tenantApi = createTenantApi();
      const response = await tenantApi.getWebhookConfig(tenantId);
      if (!response.error && response.data?.data) {
        setWebhookStatus(response.data.data as WebhookStatus);
      }
    } catch {
      // Status is supplementary — the card still shows tenant.config.webhookUrl either way.
    } finally {
      setWebhookStatusLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      fetchTenant();
      fetchKeyConfig();
      fetchWebhookStatus();
    }
  }, [tenantId]);

  const handleUpdate = async () => {
    if (!tenant) return;

    setSaving(true);
    try {
      const response = await api.v1.tenants({ tenantId: tenant.tenantId }).patch({
        businessName: formData.businessName,
        contactPhone: formData.contactPhone,
        erpSystem: formData.erpSystem as any,
        webhookUrl: formData.webhookUrl || undefined,
        webhookEnabled: formData.webhookEnabled,
        features: {
          autoFix: formData.autoFix,
          maxRetries: formData.maxRetries,
          qrCodeGeneration: formData.qrCodeGeneration,
        },
        limits: {
          monthlyInvoiceLimit: formData.monthlyInvoiceLimit,
          apiRateLimit: formData.apiRateLimit,
        },
      });

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Failed to update tenant';
        toast.error(errorMessage);
      } else if (response.data?.data) {
        toast.success('Tenant updated successfully');
        setShowEditModal(false);
        fetchTenant();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateOnboarding = async () => {
    if (!tenant) return;

    setSaving(true);
    try {
      const response = await api.v1.tenants({tenantId: tenant.tenantId}).onboarding.patch({
        status: onboardingData.status,
        notes: onboardingData.notes,
        rejectionReason: onboardingData.rejectionReason || undefined,
      });

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Failed to update onboarding status';
        toast.error(errorMessage);
      } else if (response.data?.data) {
        toast.success('Onboarding status updated successfully');
        setShowOnboardingModal(false);
        fetchTenant();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update onboarding status');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleGenerateWebhook = async () => {
    if (!tenant) return;
    setIsGenerating(true);
    try {
      const tenantApi = createTenantApi();
      const response = await tenantApi.generateWebhook(tenant.tenantId, {
        lifespan: selectedLifespan,
        webhookAuthMode: selectedAuthMode,
      });
      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to generate webhook URL');
      } else {
        const data = (response.data as any)?.data;
        if (data?.webhookUrl) {
          setGeneratedWebhook({
            webhookUrl: data.webhookUrl,
            webhookSecret: data.webhookSecret,
          });
          setSecretVisible(true);
          setShowGenerateDialog(false);
          toast.success("Webhook generated. Copy your secret now — it won't be shown again.");
          fetchTenant();
          fetchWebhookStatus();
        }
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate webhook');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateFirsCredentials = async () => {
    if (!tenant || !firsCredentialsForm.certificate || !firsCredentialsForm.publicKey) return;
    setFirsCredentialsSaving(true);
    try {
      const adminApi = getAdminApiClient();
      const response = await (adminApi as any).v1.tenants({ tenantId: tenant.tenantId })['credentials'].put({
        certificate: firsCredentialsForm.certificate,
        publicKey: firsCredentialsForm.publicKey,
      });
      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to update FIRS credentials');
      } else {
        toast.success('FIRS credentials updated successfully');
        setShowFirsCredentialsModal(false);
        setFirsCredentialsForm({ certificate: '', publicKey: '' });
        fetchTenant();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update FIRS credentials');
    } finally {
      setFirsCredentialsSaving(false);
    }
  };

  if (loading) {
    return <SectionLoader message="Loading tenant" />;
  }

  if (!tenant) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Tenant Not Found</h1>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">The tenant you're looking for doesn't exist.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/admin/tenants/all')}
              className="rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="page-title">{tenant.businessName}</h1>
              <p className="page-subtitle">Tenant Details and Configuration</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/tenants/erp-sync-config?tenantId=${tenant.tenantId}`)}
              className="rounded-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              ERP Sync Config
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setOnboardingData({
                  status: tenant.onboarding?.status || 'in_progress',
                  notes: tenant.onboarding?.notes || '',
                  rejectionReason: tenant.onboarding?.rejectionReason || '',
                });
                setShowOnboardingModal(true);
              }}
              className="rounded-full"
            >
              <Settings className="w-4 h-4 mr-2" />
              Update Onboarding
            </Button>
            <Button
              onClick={() => setShowEditModal(true)}
              className="rounded-full"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Tenant
            </Button>
          </div>
        </div>

        {/* Tenant Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{tenant.businessName}</h3>
                  <p className="text-sm text-muted-foreground">Tenant ID: {tenant.tenantId}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <StatusBadge status={tenant.status} />
                    {tenant.onboarding && (
                      <Badge className={
                        tenant.onboarding.status === 'active' 
                          ? 'bg-success/10 text-success' 
                          : tenant.onboarding.status === 'rejected'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-warning/10 text-warning'
                      }>
                        Onboarding: {tenant.onboarding.status.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Tabs */}
        <Tabs value={detailTab} onValueChange={setDetailTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Business Name</p>
                      <p className="font-medium">{tenant.businessName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">TIN</p>
                      <p className="font-mono">{tenant.tin}</p>
                    </div>
                  </div>
                  {tenant.businessRegistrationNumber && (
                    <div className="flex items-center gap-3">
                      <Key className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Registration Number</p>
                        <p className="font-mono">{tenant.businessRegistrationNumber}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Server className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">ERP System</p>
                      <Badge variant="outline">{formatErpName(tenant.erpSystem)}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{tenant.contactEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{tenant.contactPhone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">
                        {new Date(tenant.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {tenant.updatedAt && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Last Updated</p>
                        <p className="font-medium">
                          {new Date(tenant.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="configuration">
            <div className="space-y-6">
              {/* Webhook Generation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="w-5 h-5" />
                    Webhook
                  </CardTitle>
                  <CardDescription>Generate or view the webhook URL for this tenant</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Existing webhook URL */}
                  {tenant.config?.webhookUrl && !generatedWebhook && (
                    <div className="space-y-3">
                      {webhookStatus?.isExpired && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            Webhook URL and secret expired. Inbound webhooks are rejected. Please regenerate.
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Current Webhook URL</Label>
                          {!webhookStatusLoading && webhookStatus && (
                            <WebhookExpiryBadge
                              isExpired={webhookStatus.isExpired}
                              expiresAt={webhookStatus.expiresAt}
                              remainingDays={webhookStatus.remainingDays}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input value={tenant.config.webhookUrl} readOnly className="font-mono text-xs" />
                          <Button variant="outline" size="icon" onClick={() => copyToClipboard(tenant.config!.webhookUrl!, 'Webhook URL')}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <Badge variant={tenant.config.webhookEnabled ? 'default' : 'outline'}>
                          {tenant.config.webhookEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
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

                  {/* Newly generated webhook result */}
                  {generatedWebhook && (
                    <div className="space-y-3 p-3 border rounded-lg bg-muted/40">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                        <div className="flex items-center gap-2">
                          <Input value={generatedWebhook.webhookUrl} readOnly className="font-mono text-xs" />
                          <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedWebhook.webhookUrl, 'Webhook URL')}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Webhook Secret <span className="text-destructive">(copy now — won't be shown again)</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={secretVisible ? generatedWebhook.webhookSecret : '••••••••••••••••'}
                            readOnly
                            className="font-mono text-xs"
                          />
                          <Button variant="outline" size="icon" onClick={() => setSecretVisible(!secretVisible)}>
                            {secretVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedWebhook.webhookSecret, 'Webhook secret')}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generate controls */}
                  <div className="space-y-2 pt-2 border-t">
                    {tenant.config?.webhookUrl ? (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isGenerating}
                          onClick={() => {
                            setSelectedLifespan(webhookStatus?.lifespan || 'NO_EXPIRATION');
                            setSelectedAuthMode(webhookStatus?.webhookAuthMode || 'auto');
                            setShowGenerateDialog(true);
                          }}
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                          Regenerate URL &amp; Secret
                        </Button>
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs space-y-1">
                            <p><strong>Warning:</strong> Regenerating will create a new URL and secret, invalidating the previous ones and revoking all configurations tied to them.</p>
                            <p>Ensure the tenant updates any external systems using the old credentials before regenerating.</p>
                          </AlertDescription>
                        </Alert>
                      </>
                    ) : (
                      <Button
                        onClick={() => {
                          setSelectedLifespan('NO_EXPIRATION');
                          setSelectedAuthMode('auto');
                          setShowGenerateDialog(true);
                        }}
                        disabled={isGenerating}
                        className="w-full sm:w-auto"
                      >
                        <Webhook className="mr-2 h-4 w-4" />
                        Generate Webhook URL
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Invoice ID Keys */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Invoice ID Keys
                  </CardTitle>
                  <CardDescription>
                    Configure where to find each invoice type&apos;s ID in incoming webhook payloads
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {keyConfigLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Standard Invoice</p>
                        <InvoiceIdKeyEditor
                          initialValue={keyConfig.invoiceIdKey}
                          onSave={async (key) => {
                            const res = await (api as any).v1.tenants({ tenantId: tenant.tenantId })['invoice-id-key'].put({ invoiceIdKey: key });
                            if (res.error) throw new Error((res.error as any)?.value?.error || 'Failed to update invoice ID key');
                          }}
                          onSaved={() => fetchKeyConfig()}
                        />
                      </div>

                      <div className="space-y-3 pt-4 border-t">
                        <p className="text-sm font-medium">Credit Note</p>
                        <InvoiceIdKeyEditor
                          initialValue={keyConfig.creditNoteIdKey}
                          placeholder="e.g. creditNote.documentId"
                          successMessage="Credit note ID key updated"
                          onSave={async (key) => {
                            const res = await (api as any).v1.tenants({ tenantId: tenant.tenantId })['id-key-map'].put({ eventType: CREDIT_NOTE_EVENT_TYPE, idKey: key });
                            if (res.error) throw new Error((res.error as any)?.value?.error || 'Failed to update credit note ID key');
                          }}
                          onSaved={() => fetchKeyConfig()}
                        />
                        <InvoiceIdKeyEditor
                          initialValue={keyConfig.creditNoteReferenceIdKey}
                          label="Reference ID Key"
                          placeholder="e.g. creditNote.originalInvoiceId"
                          helpText="Dot-notation path to the original invoice's ID, used to validate this credit note against it"
                          successMessage="Credit note reference ID key updated"
                          onSave={async (key) => {
                            const res = await (api as any).v1.tenants({ tenantId: tenant.tenantId })['reference-id-key-map'].put({ eventType: CREDIT_NOTE_EVENT_TYPE, idKey: key });
                            if (res.error) throw new Error((res.error as any)?.value?.error || 'Failed to update credit note reference ID key');
                          }}
                          onSaved={() => fetchKeyConfig()}
                        />
                      </div>

                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-muted-foreground">Debit Note</p>
                          <Badge variant="outline" className="text-xs gap-1">
                            <Lock className="w-3 h-3" />
                            Coming soon
                          </Badge>
                        </div>
                        <div className="space-y-2 opacity-60">
                          <Label className="text-xs text-muted-foreground">Invoice ID Key</Label>
                          <Input disabled placeholder="e.g. debitNote.documentId" className="font-mono text-xs" />
                        </div>
                        <div className="space-y-2 opacity-60">
                          <Label className="text-xs text-muted-foreground">Reference ID Key</Label>
                          <Input disabled placeholder="e.g. debitNote.originalInvoiceId" className="font-mono text-xs" />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Features & Limits */}
              <Card>
                <CardHeader>
                  <CardTitle>Configuration</CardTitle>
                  <CardDescription>Tenant-specific settings and limits</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {tenant.config?.features && (
                    <div>
                      <p className="text-sm font-medium mb-2">Features</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Auto Fix</span>
                          <Badge variant={tenant.config.features.autoFix ? 'default' : 'outline'}>
                            {tenant.config.features.autoFix ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        {tenant.config.features.maxRetries !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Max Retries</span>
                            <span className="font-medium">{tenant.config.features.maxRetries}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm">QR Code Generation</span>
                          <Badge variant={tenant.config.features.qrCodeGeneration ? 'default' : 'outline'}>
                            {tenant.config.features.qrCodeGeneration ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {tenant.config?.limits && (
                    <div>
                      <p className="text-sm font-medium mb-2">Limits</p>
                      <div className="space-y-2">
                        {tenant.config.limits.monthlyInvoiceLimit !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Monthly Invoice Limit</span>
                            <span className="font-medium">
                              {tenant.config.limits.monthlyInvoiceLimit.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {tenant.config.limits.apiRateLimit !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm">API Rate Limit</span>
                            <span className="font-medium">
                              {tenant.config.limits.apiRateLimit.toLocaleString()} / hour
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* FIRS Credentials */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Shield className="h-4 w-4" />
                        FIRS Credentials
                      </CardTitle>
                      <CardDescription>Certificate and public key used for invoice signing</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFirsCredentialsForm({ certificate: '', publicKey: '' });
                        setShowFirsCredentialsModal(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Update Credentials
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>
                      {(tenant as any)?.config?.nrs
                        ? 'FIRS credentials are configured for this tenant.'
                        : 'No FIRS credentials configured yet.'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="onboarding">
            <Card>
              <CardHeader>
                <CardTitle>Onboarding Status</CardTitle>
                <CardDescription>Track tenant onboarding progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tenant.onboarding ? (
                  <>
                    <div>
                      <p className="text-sm font-medium mb-2">Status</p>
                      <Badge className={
                        tenant.onboarding.status === 'active' 
                          ? 'bg-success/10 text-success' 
                          : tenant.onboarding.status === 'rejected'
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-warning/10 text-warning'
                      }>
                        {tenant.onboarding.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    {tenant.onboarding.progress !== undefined && (
                      <div>
                        <p className="text-sm font-medium mb-2">Progress</p>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${tenant.onboarding.progress}%` }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tenant.onboarding.progress}% complete
                        </p>
                      </div>
                    )}
                    {tenant.onboarding.notes && (
                      <div>
                        <p className="text-sm font-medium mb-2">Notes</p>
                        <p className="text-sm text-muted-foreground">{tenant.onboarding.notes}</p>
                      </div>
                    )}
                    {tenant.onboarding.rejectionReason && (
                      <div>
                        <p className="text-sm font-medium mb-2 text-destructive">Rejection Reason</p>
                        <p className="text-sm text-destructive">{tenant.onboarding.rejectionReason}</p>
                      </div>
                    )}
                    {tenant.onboarding.approvedAt && (
                      <div>
                        <p className="text-sm font-medium mb-2">Approved At</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tenant.onboarding.approvedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No onboarding information available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* FIRS Credentials Modal */}
      <Dialog open={showFirsCredentialsModal} onOpenChange={setShowFirsCredentialsModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Update FIRS Credentials
            </DialogTitle>
            <DialogDescription>
              Replace the certificate and public key for <strong>{tenant?.businessName}</strong>.
              Paste the full PEM-encoded content including the header and footer lines.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Certificate</Label>
              <Textarea
                placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                className="font-mono text-xs min-h-[120px]"
                value={firsCredentialsForm.certificate}
                onChange={(e) => setFirsCredentialsForm(f => ({ ...f, certificate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Public Key</Label>
              <Textarea
                placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
                className="font-mono text-xs min-h-[120px]"
                value={firsCredentialsForm.publicKey}
                onChange={(e) => setFirsCredentialsForm(f => ({ ...f, publicKey: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFirsCredentialsModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateFirsCredentials}
              disabled={firsCredentialsSaving || !firsCredentialsForm.certificate || !firsCredentialsForm.publicKey}
            >
              {firsCredentialsSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Credentials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update tenant information and configuration
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="limits">Limits</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-businessName">Business Name *</Label>
                <Input
                  id="edit-businessName"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-contactEmail">Contact Email</Label>
                  <Input
                    id="edit-contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">The tenant can change this from their own profile.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contactPhone">Contact Phone *</Label>
                  <Input
                    id="edit-contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-erpSystem">ERP System *</Label>
                <Select
                  value={formData.erpSystem}
                  onValueChange={(value) => setFormData({ ...formData, erpSystem: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ERP system" />
                  </SelectTrigger>
                  <SelectContent>
                    {ERP_OPTIONS.map((erp) => (
                      <SelectItem key={erp} value={erp}>
                        {formatErpName(erp)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-webhookUrl">Webhook URL</Label>
                  <Input
                    id="edit-webhookUrl"
                    value={formData.webhookUrl}
                    onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    placeholder="https://example.com/webhook"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-webhookEnabled">Webhook Enabled</Label>
                  <Select
                    value={formData.webhookEnabled ? 'true' : 'false'}
                    onValueChange={(value) => setFormData({ ...formData, webhookEnabled: value === 'true' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Enabled</SelectItem>
                      <SelectItem value="false">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-autoFix">Auto Fix</Label>
                <Select
                  value={formData.autoFix ? 'true' : 'false'}
                  onValueChange={(value) => setFormData({ ...formData, autoFix: value === 'true' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Enabled</SelectItem>
                    <SelectItem value="false">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-maxRetries">Max Retries</Label>
                <Input
                  id="edit-maxRetries"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.maxRetries}
                  onChange={(e) => setFormData({ ...formData, maxRetries: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-qrCodeGeneration">QR Code Generation</Label>
                <Select
                  value={formData.qrCodeGeneration ? 'true' : 'false'}
                  onValueChange={(value) => setFormData({ ...formData, qrCodeGeneration: value === 'true' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Enabled</SelectItem>
                    <SelectItem value="false">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-monthlyInvoiceLimit">Monthly Invoice Limit</Label>
                <Input
                  id="edit-monthlyInvoiceLimit"
                  type="number"
                  min="0"
                  value={formData.monthlyInvoiceLimit || ''}
                  onChange={(e) => setFormData({ ...formData, monthlyInvoiceLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Unlimited if empty"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-apiRateLimit">API Rate Limit (per hour)</Label>
                <Input
                  id="edit-apiRateLimit"
                  type="number"
                  min="0"
                  value={formData.apiRateLimit || ''}
                  onChange={(e) => setFormData({ ...formData, apiRateLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Unlimited if empty"
                />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? 'Updating...' : 'Update Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Onboarding Status Modal */}
      <Dialog open={showOnboardingModal} onOpenChange={setShowOnboardingModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Onboarding Status</DialogTitle>
            <DialogDescription>
              Update the onboarding status for this tenant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="onboarding-status">Onboarding Status *</Label>
              <Select
                value={onboardingData.status}
                onValueChange={(value: any) => setOnboardingData({ ...onboardingData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="testing">Testing</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="onboarding-notes">Notes</Label>
              <Input
                id="onboarding-notes"
                value={onboardingData.notes}
                onChange={(e) => setOnboardingData({ ...onboardingData, notes: e.target.value })}
                placeholder="Additional notes about onboarding"
              />
            </div>
            {onboardingData.status === 'rejected' && (
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                <Input
                  id="rejection-reason"
                  value={onboardingData.rejectionReason}
                  onChange={(e) => setOnboardingData({ ...onboardingData, rejectionReason: e.target.value })}
                  placeholder="Reason for rejection"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOnboardingModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateOnboarding} 
              disabled={saving || (onboardingData.status === 'rejected' && !onboardingData.rejectionReason)}
            >
              {saving ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate/Regenerate Webhook Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tenant?.config?.webhookUrl ? 'Regenerate Webhook' : 'Generate Webhook'}</DialogTitle>
            <DialogDescription>
              Choose how the webhook should authenticate requests and how long the URL/secret should remain valid.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Authentication Mode</Label>
              <Select value={selectedAuthMode} onValueChange={setSelectedAuthMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTH_MODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                &quot;Auto&quot; accepts both modern HMAC signatures and legacy static secrets.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Lifespan</Label>
              <Select value={selectedLifespan} onValueChange={setSelectedLifespan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIFESPAN_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tenant?.config?.webhookUrl && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs space-y-1">
                  <p>
                    This action is <strong>irreversible</strong> and will invalidate the existing
                    webhook URL and secret, and disconnect any currently connected ERP or external
                    system.
                  </p>
                  <p>Share the new credentials with the tenant so they can update their connected systems.</p>
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button
              variant={tenant?.config?.webhookUrl ? 'destructive' : 'default'}
              onClick={handleGenerateWebhook}
              disabled={isGenerating}
            >
              {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {tenant?.config?.webhookUrl ? 'Yes, Regenerate' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
