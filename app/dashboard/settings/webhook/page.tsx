'use client'

import { useState, useEffect } from 'react'
import {
  Webhook,
  Zap,
  Copy,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Plus,
  Trash2,
  Settings2,
  Activity,
  Globe,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'
import { createTenantApi } from '@/lib/api/tenant-api'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'

// Available webhook event types that can be received from external systems
const INBOUND_EVENT_TYPES = [
  { value: 'erp.invoice.created', label: 'Invoice Created', description: 'New invoice created in the ERP system' },
  { value: 'erp.invoice.updated', label: 'Invoice Updated', description: 'Existing invoice modified in the ERP' },
  { value: 'erp.payment.received', label: 'Payment Received', description: 'Payment recorded against an invoice' },
  { value: 'erp.credit_note.created', label: 'Credit Note Created', description: 'Credit/debit note issued' },
  { value: 'erp.invoice.cancelled', label: 'Invoice Cancelled', description: 'Invoice cancelled in the ERP' },
  { value: 'firs.invoice.received', label: 'FIRS Invoice Received', description: 'Inbound invoice from FIRS' },
  { value: 'firs.status.updated', label: 'FIRS Status Updated', description: 'Invoice status change from FIRS' },
  { value: 'firs.invoice.acknowledged', label: 'FIRS Acknowledged', description: 'Invoice acknowledged by FIRS' },
] as const

// Workflows that events can be routed to
const WORKFLOWS = [
  { value: 'outbound', label: 'Outbound Workflow', description: 'Transform → Validate → Sign → Transmit to FIRS' },
  { value: 'inbound', label: 'Inbound Workflow', description: 'Receive → Validate → Decrypt → Store' },
  { value: 'transform_only', label: 'Transform Only', description: 'Convert ERP format to UBL without submission' },
  { value: 'validate_only', label: 'Validate Only', description: 'Schema validation without processing' },
  { value: 'acknowledge', label: 'Acknowledge', description: 'Send acknowledgment back to FIRS' },
] as const

interface EventMapping {
  eventType: string
  workflow: string
  enabled: boolean
}

interface WebhookConfig {
  webhookUrl: string
  webhookSecret: string
  webhookPath: string
  webhookEnabled: boolean
}

interface TestResult {
  webhookUrl: string
  testResult: any
  payload: Record<string, unknown>
}

export default function WebhookSettingsPage() {
  const { tenantId, tenantData, refetch } = useTenant()
  const { hasPermission } = usePermissions()
  const canUpdate = hasPermission('settings:update')

  // Webhook config state
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig | null>(null)
  const [webhookEnabled, setWebhookEnabled] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingConfig, setLoadingConfig] = useState(true)

  // Test state
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testPassed, setTestPassed] = useState(false)
  const [customPayload, setCustomPayload] = useState('')

  // Event mapping state
  const [eventMappings, setEventMappings] = useState<EventMapping[]>([])
  const [savingMappings, setSavingMappings] = useState(false)

  // Load config from tenant data
  useEffect(() => {
    if (tenantData) {
      const td = tenantData as any
      const config = td?.data?.config || td?.data || td?.config || td
      const metadata = td?.data?.metadata || td?.metadata || {}

      setWebhookEnabled(!!config?.webhookEnabled)

      if (config?.webhookUrl) {
        setWebhookConfig({
          webhookUrl: config.webhookUrl,
          webhookSecret: config.webhookSecret || '••••••••',
          webhookPath: config.webhookPath || '',
          webhookEnabled: !!config.webhookEnabled,
        })
      }

      // Load existing event mappings from metadata
      if (metadata?.webhookEventMappings) {
        setEventMappings(metadata.webhookEventMappings)
      } else {
        // Default mappings
        setEventMappings([
          { eventType: 'erp.invoice.created', workflow: 'outbound', enabled: true },
          { eventType: 'firs.invoice.received', workflow: 'inbound', enabled: true },
        ])
      }

      setLoadingConfig(false)
    }
  }, [tenantData])

  const handleGenerate = async () => {
    if (!tenantId) return
    setIsGenerating(true)
    try {
      const api = createTenantApi()
      const response = await api.generateWebhook(tenantId)

      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to generate webhook URL')
      } else {
        const data = (response.data as any)?.data
        if (data?.webhookUrl) {
          setWebhookConfig({
            webhookUrl: data.webhookUrl,
            webhookSecret: data.webhookSecret,
            webhookPath: data.webhookPath,
            webhookEnabled: true,
          })
          setWebhookEnabled(true)
          toast.success('Webhook URL generated successfully')
          refetch()
        }
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate webhook URL')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleToggleWebhook = async (enabled: boolean) => {
    if (!tenantId) return
    try {
      const api = createTenantApi()
      const response = await api.updateTenant(tenantId, { webhookEnabled: enabled })

      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to update webhook')
      } else {
        setWebhookEnabled(enabled)
        toast.success(`Webhook ${enabled ? 'enabled' : 'disabled'}`)
        refetch()
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update webhook')
    }
  }

  const handleTest = async () => {
    if (!tenantId) return
    setIsTesting(true)
    setTestResult(null)
    try {
      const api = createTenantApi()
      let payload: Record<string, unknown> | undefined
      if (customPayload.trim()) {
        try {
          payload = JSON.parse(customPayload)
        } catch {
          toast.error('Invalid JSON payload')
          setIsTesting(false)
          return
        }
      }

      const response = await api.testWebhook(tenantId, payload)

      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Webhook test failed')
        setIsTesting(false)
        return
      }

      const data = (response.data as any)?.data
      if (data) {
        setTestResult(data)
        const passed = data.testResult?.success !== false
        setTestPassed(passed)
        toast[passed ? 'success' : 'error'](
          passed ? 'Webhook test passed!' : 'Webhook test failed'
        )
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to test webhook')
    } finally {
      setIsTesting(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  // Event mapping management
  const addMapping = () => {
    setEventMappings([
      ...eventMappings,
      { eventType: '', workflow: '', enabled: true },
    ])
  }

  const updateMapping = (index: number, field: keyof EventMapping, value: any) => {
    const updated = [...eventMappings]
    updated[index] = { ...updated[index], [field]: value }
    setEventMappings(updated)
  }

  const removeMapping = (index: number) => {
    setEventMappings(eventMappings.filter((_, i) => i !== index))
  }

  const handleSaveMappings = async () => {
    if (!tenantId) return

    // Validate mappings
    const validMappings = eventMappings.filter((m) => m.eventType && m.workflow)
    if (validMappings.length === 0) {
      toast.error('Please add at least one valid event mapping')
      return
    }

    setSavingMappings(true)
    try {
      const api = createTenantApi()
      // Store event mappings in tenant metadata via updateTenant
      const response = await api.updateTenant(tenantId, {
        features: {
          webhookEventMappings: validMappings,
        } as any,
      })

      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to save event mappings')
      } else {
        toast.success('Event mappings saved successfully')
        refetch()
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save event mappings')
    } finally {
      setSavingMappings(false)
    }
  }

  const getEventLabel = (value: string) =>
    INBOUND_EVENT_TYPES.find((e) => e.value === value)?.label || value

  const getWorkflowLabel = (value: string) =>
    WORKFLOWS.find((w) => w.value === value)?.label || value

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading webhook settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Webhook Settings</h1>
          <p className="text-muted-foreground">
            Configure webhooks to receive events from external systems and route them to workflows
          </p>
        </div>
      </div>

      {/* Webhook URL Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Webhook className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Webhook Endpoint</CardTitle>
                <CardDescription>
                  Your webhook URL receives events from external systems like ERPs and FIRS
                </CardDescription>
              </div>
            </div>
            {webhookConfig && canUpdate && (
              <div className="flex items-center gap-3">
                <Label htmlFor="webhook-toggle" className="text-sm text-muted-foreground">
                  {webhookEnabled ? 'Enabled' : 'Disabled'}
                </Label>
                <Switch
                  id="webhook-toggle"
                  checked={webhookEnabled}
                  onCheckedChange={handleToggleWebhook}
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {webhookConfig ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={webhookConfig.webhookUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(webhookConfig.webhookUrl, 'Webhook URL')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Webhook Secret</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={webhookConfig.webhookSecret}
                    readOnly
                    className="font-mono text-xs"
                    type="password"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      copyToClipboard(webhookConfig.webhookSecret, 'Webhook Secret')
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {webhookConfig.webhookPath && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Webhook Path</Label>
                  <Input
                    value={webhookConfig.webhookPath}
                    readOnly
                    className="font-mono text-xs"
                  />
                </div>
              )}

              {canUpdate && (
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                  Regenerate URL
                </Button>
              )}

              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  External systems should send HTTP POST requests to this URL with event payloads.
                  Include the webhook secret in the <code className="bg-muted px-1 rounded">X-Webhook-Secret</code> header for authentication.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="text-center py-8">
              <Webhook className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Webhook Configured</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate a webhook URL to start receiving events from external systems.
              </p>
              {canUpdate && (
                <Button onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Webhook className="mr-2 h-4 w-4" />
                      Generate Webhook URL
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event-to-Workflow Mapping */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Settings2 className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle>Event Routing</CardTitle>
                <CardDescription>
                  Map incoming webhook events to the appropriate processing workflow
                </CardDescription>
              </div>
            </div>
            {canUpdate && (
              <Button variant="outline" size="sm" onClick={addMapping}>
                <Plus className="w-4 h-4 mr-2" />
                Add Mapping
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {eventMappings.length === 0 ? (
            <div className="text-center py-8">
              <ArrowRight className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No event mappings configured. Add a mapping to route incoming events to workflows.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header row */}
              <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr_auto_auto] gap-3 items-center text-xs font-medium text-muted-foreground px-1">
                <span>Event Type</span>
                <span></span>
                <span>Route to Workflow</span>
                <span>Active</span>
                <span></span>
              </div>

              {eventMappings.map((mapping, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_auto] gap-3 items-center p-3 rounded-lg border bg-card"
                >
                  {/* Event Type */}
                  <Select
                    value={mapping.eventType}
                    onValueChange={(val) => updateMapping(index, 'eventType', val)}
                    disabled={!canUpdate}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select event..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INBOUND_EVENT_TYPES.map((evt) => (
                        <SelectItem key={evt.value} value={evt.value}>
                          <div>
                            <span>{evt.label}</span>
                            <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                              — {evt.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Arrow */}
                  <div className="hidden md:flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>

                  {/* Workflow */}
                  <Select
                    value={mapping.workflow}
                    onValueChange={(val) => updateMapping(index, 'workflow', val)}
                    disabled={!canUpdate}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select workflow..." />
                    </SelectTrigger>
                    <SelectContent>
                      {WORKFLOWS.map((wf) => (
                        <SelectItem key={wf.value} value={wf.value}>
                          <div>
                            <span>{wf.label}</span>
                            <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                              — {wf.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Enabled toggle */}
                  <div className="flex items-center justify-center">
                    <Switch
                      checked={mapping.enabled}
                      onCheckedChange={(val) => updateMapping(index, 'enabled', val)}
                      disabled={!canUpdate}
                    />
                  </div>

                  {/* Remove */}
                  {canUpdate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeMapping(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}

              {canUpdate && (
                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveMappings} disabled={savingMappings}>
                    {savingMappings ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Mappings'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Mapping Summary */}
          {eventMappings.filter((m) => m.eventType && m.workflow && m.enabled).length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm font-medium mb-3">Active Routes Summary</p>
                <div className="flex flex-wrap gap-2">
                  {eventMappings
                    .filter((m) => m.eventType && m.workflow && m.enabled)
                    .map((m, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-xs py-1 px-3"
                      >
                        {getEventLabel(m.eventType)} → {getWorkflowLabel(m.workflow)}
                      </Badge>
                    ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Webhook Test */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-info" />
            </div>
            <div>
              <CardTitle>Test Webhook</CardTitle>
              <CardDescription>
                Send a test payload to verify your webhook is receiving events correctly
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Custom Test Payload (optional JSON)
              </Label>
              <textarea
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                placeholder='{"event": "erp.invoice.created", "data": {"invoiceNumber": "INV-001"}}'
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use a default test payload.
              </p>
            </div>

            <Button
              onClick={handleTest}
              disabled={isTesting || !webhookConfig}
              variant="outline"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending test...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  {testResult ? 'Retry Test' : 'Send Test Payload'}
                </>
              )}
            </Button>

            {!webhookConfig && (
              <p className="text-xs text-muted-foreground">
                Generate a webhook URL first before testing.
              </p>
            )}

            {testResult && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  {testPassed ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <span
                    className={`font-medium ${testPassed ? 'text-success' : 'text-destructive'}`}
                  >
                    {testPassed ? 'Test Passed' : 'Test Failed'}
                  </span>
                </div>

                {testResult.webhookUrl && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Webhook URL:</span>
                    <p className="text-xs font-mono bg-muted p-2 rounded">
                      {testResult.webhookUrl}
                    </p>
                  </div>
                )}

                {testResult.testResult && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Response:</span>
                    <pre className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto max-h-[200px]">
                      {JSON.stringify(testResult.testResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Webhook Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Activity className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>How Webhooks Work</CardTitle>
              <CardDescription>
                Understanding the event flow
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    1
                  </div>
                  <span className="font-medium">Receive</span>
                </div>
                <p className="text-muted-foreground text-xs">
                  External systems (ERP, FIRS) send events to your webhook URL via HTTP POST
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    2
                  </div>
                  <span className="font-medium">Route</span>
                </div>
                <p className="text-muted-foreground text-xs">
                  Events are matched against your configured event mappings and routed to the appropriate workflow
                </p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    3
                  </div>
                  <span className="font-medium">Process</span>
                </div>
                <p className="text-muted-foreground text-xs">
                  The workflow processes the event: transforms, validates, signs, and transmits the invoice data
                </p>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                All webhook requests are verified using the webhook secret for security. Events are processed
                asynchronously and you can track their status in the Transaction Log.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
