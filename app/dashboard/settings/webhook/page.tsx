'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Webhook,
  Zap,
  Copy,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Plus,
  Trash2,
  Settings2,
  Activity,
  Globe,
  Server,
  FileJson,
  Link2,
  Unlink,
  Radio,
  StopCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataTable, Column, StatusBadge } from '@/components/shared'
import { toast } from '@/components/ui/sonner'
import { createTenantApi } from '@/lib/api/tenant-api'
import { createTenantWebhookListener, getAdminApiClient } from '@/lib/api/client'

import { getTenantApiClient } from '@/lib/api/client'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format } from 'date-fns'

import ButterflyDataMapping from 'react-data-mapping';
import 'react-data-mapping/dist/index.css';


// ===== Constants =====

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

const WORKFLOWS = [
  { value: 'outbound', label: 'Outbound Workflow', description: 'Transform → Validate → Sign → Transmit to FIRS' },
  { value: 'inbound', label: 'Inbound Workflow', description: 'Receive → Validate → Decrypt → Store' },
  { value: 'transform_only', label: 'Transform Only', description: 'Convert ERP format to UBL without submission' },
  { value: 'validate_only', label: 'Validate Only', description: 'Schema validation without processing' },
  { value: 'acknowledge', label: 'Acknowledge', description: 'Send acknowledgment back to FIRS' },
] as const

// ===== Types =====

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

interface MappingRule {
  source: string
  target: string
}

interface FirsDictionaryField {
  field_id: string
  field_path: string
  data_type: string
  description: string
  is_required: boolean
}

interface WebhookEvent {
  id: string
  eventId?: string
  eventType: string
  status: string
  invoiceIrn?: string
  invoiceNumber?: string
  timestamp: string | Date
  response?: any
  payload?: any
}

// ===== Utilities =====

function flattenObject(obj: any, prefix = ''): { key: string; type: string }[] {
  const result: { key: string; type: string }[] = []
  if (!obj || typeof obj !== 'object') return result

  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === 'object') {
      result.push(...flattenObject(obj[0], `${prefix}[*]`))
    } else {
      result.push({ key: prefix || 'root', type: 'array' })
    }
    return result
  }

  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      result.push(...flattenObject(v, fullKey))
    } else if (Array.isArray(v)) {
      if (v.length > 0 && typeof v[0] === 'object') {
        result.push(...flattenObject(v[0], `${fullKey}[*]`))
      } else {
        result.push({ key: fullKey, type: 'array' })
      }
    } else {
      result.push({ key: fullKey, type: typeof v })
    }
  }
  return result
}

// ===== Main Component =====

export default function WebhookSettingsPage() {
  const { tenantId, tenantData, refetch } = useTenant()
  const { hasPermission } = usePermissions()
  const tenantAPI = getTenantApiClient()
  const canUpdate = hasPermission('settings:update')

  // Config state
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig | null>(null)
  const [webhookEnabled, setWebhookEnabled] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingConfig, setLoadingConfig] = useState(true)

  // Test state
  const [testMode, setTestMode] = useState<'manual' | 'listen'>('manual')
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testPassed, setTestPassed] = useState(false)
  const [customPayload, setCustomPayload] = useState('')

  // Event mapping state
  const [eventMappings, setEventMappings] = useState<EventMapping[]>([])
  const [savingMappings, setSavingMappings] = useState(false)

  // Data mapping state
  const [firsFields, setFirsFields] = useState<FirsDictionaryField[]>([])
  const [firsLoading, setFirsLoading] = useState(false)
  const [receivedPayload, setReceivedPayload] = useState<any>(null)
  const [mappingData, setMappingData] = useState<MappingRule[]>([])
  const [showMapper, setShowMapper] = useState(false)
  const [savingFieldMappings, setSavingFieldMappings] = useState(false)

  // History state
  const [webhookHistory, setWebhookHistory] = useState<WebhookEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null)

  // Listener state
  const [isListening, setIsListening] = useState(false)
  const [listenerConnected, setListenerConnected] = useState(false)
  const [listenedEvents, setListenedEvents] = useState<any[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)

  // Load config from tenant data
  useEffect(() => {
    if (tenantData) {
      const td = tenantData as any
      const config = td?.data?.config || td?.data || td?.config || td
      const metadata = td?.data?.metadata || td?.metadata || {}

      setWebhookEnabled(!!config?.webhookEnabled)

      if (config?.webhookUrl) {
        console.log({ config, metadata })
        setWebhookConfig({
          webhookUrl: config.webhookUrl,
          webhookSecret: config.webhookAuth || '••••••••',
          webhookPath: metadata.webhookPath || config.webhookPath || '',
          webhookEnabled: !!config.webhookEnabled,
        })
      }

      if (metadata?.webhookEventMappings) {
        setEventMappings(metadata.webhookEventMappings)
      } else {
        setEventMappings([
          { eventType: 'erp.invoice.created', workflow: 'outbound', enabled: true },
          { eventType: 'firs.invoice.received', workflow: 'inbound', enabled: true },
        ])
      }

      if (metadata?.webhookFieldMappings) {
        setMappingData(metadata.webhookFieldMappings)
      }

      setLoadingConfig(false)
    }
  }, [tenantData])

  // Fetch FIRS dictionary for mapping target fields
  const fetchFirsDictionary = useCallback(async () => {
    setFirsLoading(true)
    try {
      const adminApi = getAdminApiClient()
      const response = await adminApi.v1.admin.config['firs-dictionary'].get()
      if (response.data && 'data' in response.data && (response.data as any).data) {
        const data = (response.data as any).data
        if (data.fields && Array.isArray(data.fields)) {
          setFirsFields(data.fields)
        }
      }
    } catch {
      // FIRS dictionary may not exist yet
    } finally {
      setFirsLoading(false)
    }
  }, [])

  // Fetch webhook history from recent outbound invoices
  const fetchWebhookHistory = useCallback(async () => {
    if (!tenantId) return
    setHistoryLoading(true)
    try {
      const api = createTenantApi()
      const response = await api.getOutboundInvoices({ limit: '20', page: '1' })

      if (response.data?.data) {
        const invoices = response.data.data as any[]
        const events: WebhookEvent[] = []

        for (const inv of invoices) {
          // Try to get detail for webhook events
          try {
            const detail = await api.getOutboundInvoice(inv.irn)
            const detailData = (detail.data as any)?.data
            if (detailData?.webhookEvents && Array.isArray(detailData.webhookEvents)) {
              for (const evt of detailData.webhookEvents) {
                events.push({
                  id: evt._id || evt.eventId || `${inv.irn}-${events.length}`,
                  eventId: evt.eventId,
                  eventType: evt.eventType || 'unknown',
                  status: evt.status || 'unknown',
                  invoiceIrn: inv.irn,
                  invoiceNumber: inv.invoiceNumber,
                  timestamp: evt.createdAt || evt.timestamp || inv.createdAt,
                  response: evt.response,
                  payload: evt.payload,
                })
              }
            }
          } catch {
            // Skip invoice if detail fetch fails
          }
        }

        events.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        setWebhookHistory(events)
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load webhook history')
    } finally {
      setHistoryLoading(false)
    }
  }, [tenantId])

  // ===== Handlers =====

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

        // Set received payload for mapping
        const receivedData = data.payload || data.testResult?.data || (payload ? payload : null)
        if (receivedData) {
          setReceivedPayload(receivedData)
        }

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

  // Event mapping handlers
  const addMapping = () => {
    setEventMappings([...eventMappings, { eventType: '', workflow: '', enabled: true }])
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
    const validMappings = eventMappings.filter((m) => m.eventType && m.workflow)
    if (validMappings.length === 0) {
      toast.error('Please add at least one valid event mapping')
      return
    }
    setSavingMappings(true)
    try {
      const api = createTenantApi()
      const response = await api.updateTenant(tenantId, {
        features: { webhookEventMappings: validMappings } as any,
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

  // Field mapping handlers
  const addFieldMapping = (source: string, target: string) => {
    if (mappingData.some((m) => m.source === source && m.target === target)) return
    setMappingData([...mappingData, { source, target }])
  }

  const removeFieldMappingBySource = (source: string) => {
    setMappingData(mappingData.filter((m) => m.source !== source))
  }

  const removeFieldMappingByTarget = (target: string) => {
    setMappingData(mappingData.filter((m) => m.target !== target))
  }

  const handleSaveFieldMappings = async () => {
    if (!tenantId) return
    setSavingFieldMappings(true)
    try {
      const api = createTenantApi()
      const response = await api.updateTenant(tenantId, {
        features: { webhookFieldMappings: mappingData } as any,
      })
      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to save field mappings')
      } else {
        toast.success('Field mappings saved successfully')
        refetch()
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save field mappings')
    } finally {
      setSavingFieldMappings(false)
    }
  }

  const handleOpenMapper = () => {
    if (firsFields.length === 0) {
      fetchFirsDictionary()
    }
    setShowMapper(true)
  }

  const handlePastePayload = () => {
    if (!customPayload.trim()) {
      toast.error('Enter a JSON payload first')
      return
    }
    try {
      const parsed = JSON.parse(customPayload)
      setReceivedPayload(parsed)
      handleOpenMapper()
    } catch {
      toast.error('Invalid JSON')
    }
  }

  const connectedHandler = (data) => {
    try {
      setListenerConnected(true)
      toast.success(data.message || 'Connected : listening for events')
    } catch {
      setListenerConnected(true)
      toast.success('Connected : listening for events')
    }
  }

  const listenerEventHandler = (data) => {
    try {
      console.log(data)
      setListenedEvents((prev) => [{ ...data, _receivedAt: new Date().toISOString() }, ...prev])
      toast.info(`Event received: ${data.eventType || 'webhook_event'}`)

      // Auto-set as received payload for mapping
      setReceivedPayload(data.payload || data.data || data)
    } catch {
      // raw text event
      setListenedEvents((prev) => [{ raw: data, _receivedAt: new Date().toISOString() }, ...prev])
    }
  }
  // SSE Listener handlers
  const handleStartListening = async () => {
    try {
      console.log({ webhookConfig })
      if (!webhookConfig?.webhookPath) {
        toast.error('No webhook path configured. Generate a webhook URL first.')
        return
      }
      const listenerURL = webhookConfig?.webhookUrl.replace("inbound", "listen")
      setIsListening(true)
      setListenerConnected(false)
      setListenedEvents([])

      const { data, error }: any = await createTenantWebhookListener(listenerURL).get()
      if (error) {
        setIsListening(false)
        setListenerConnected(false)
        toast.error('Listener connection closed')
      }

      for await (const chunk of data) {
        console.log({ chunk })
        const eventType =
          (chunk as any)?.event ||
          (chunk as any)?.eventType

        switch (eventType) {
          case 'connected':
            connectedHandler(chunk)
            break;
          default:
            listenerEventHandler(chunk)
            break;
        }
      }
    } catch (error) {
       setIsListening(false)
        setListenerConnected(false)
        toast.error('Listener connection closed')
    }
  }
  const _handleStartListening = () => {
    console.log({ webhookConfig })
    if (!webhookConfig?.webhookPath) {
      toast.error('No webhook path configured. Generate a webhook URL first.')
      return
    }


    const apiUrl = process.env.NEXT_PUBLIC_API_URL || `${window.location.origin}/api/v1`
    const sseUrl = webhookConfig?.webhookUrl.replace("inbound", "listen")
    //`${apiUrl}/webhook/listen/${webhookConfig.webhookPath}`

    setIsListening(true)
    setListenerConnected(false)
    setListenedEvents([])

    const es = new EventSource(sseUrl, { withCredentials: true })
    eventSourceRef.current = es

    es.addEventListener('connected', (e) => {
      try {
        const data = JSON.parse(e.data)
        setListenerConnected(true)
        toast.success(data.message || 'Connected : listening for events')
      } catch {
        setListenerConnected(true)
        toast.success('Connected : listening for events')
      }
    })

    es.addEventListener('webhook_event', (e) => {
      try {
        console.log(e.data)
        const data = JSON.parse(e.data)
        setListenedEvents((prev) => [{ ...data, _receivedAt: new Date().toISOString() }, ...prev])
        toast.info(`Event received: ${data.eventType || 'webhook_event'}`)

        // Auto-set as received payload for mapping
        setReceivedPayload(data.payload || data.data || data)
      } catch {
        // raw text event
        setListenedEvents((prev) => [{ raw: e.data, _receivedAt: new Date().toISOString() }, ...prev])
      }
    })

    // Generic message handler for unnamed events
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.event === 'connected') {
          setListenerConnected(true)
          toast.success(data.data?.message || 'Connected : listening for events')
          return
        }
        setListenedEvents((prev) => [{ ...data, _receivedAt: new Date().toISOString() }, ...prev])
        toast.info(`Event received: ${data.event || data.eventType || 'event'}`)
        setReceivedPayload(data.data || data.payload || data)
      } catch {
        // non-JSON message
      }
    }

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        setIsListening(false)
        setListenerConnected(false)
        toast.error('Listener connection closed')
      }
    }
  }

  const handleStopListening = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsListening(false)
    setListenerConnected(false)
    toast.warning('Stopped listening')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [])

  const getEventLabel = (value: string) =>
    INBOUND_EVENT_TYPES.find((e) => e.value === value)?.label || value

  const getWorkflowLabel = (value: string) =>
    WORKFLOWS.find((w) => w.value === value)?.label || value

  // Derived fields for mapping
  const sourceFields = useMemo(() => {
    if (!receivedPayload) return []
    return flattenObject(receivedPayload)
  }, [receivedPayload])

  const targetFields = useMemo(() => {
    return firsFields.map((f) => ({
      key: f.field_path || f.field_id,
      type: f.data_type,
      required: f.is_required,
      description: f.description,
    }))
  }, [firsFields])

  // History columns
  const historyColumns: Column<WebhookEvent>[] = [
    {
      key: 'eventType',
      header: 'Event Type',
      sortable: true,
      accessor: (evt) => (
        <span className="font-mono text-xs">{evt.eventType}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (evt) => <StatusBadge status={evt.status} />,
    },
    {
      key: 'invoiceIrn',
      header: 'Invoice',
      accessor: (evt) => (
        <span className="text-xs text-muted-foreground font-mono">
          {evt.invoiceNumber || evt.invoiceIrn || 'N/A'}
        </span>
      ),
    },
    {
      key: 'timestamp',
      header: 'Time',
      sortable: true,
      accessor: (evt) => (
        <div className="text-xs">
          <p className="text-muted-foreground">
            {evt.timestamp
              ? formatDistanceToNow(new Date(evt.timestamp), { addSuffix: true })
              : 'N/A'}
          </p>
          {evt.timestamp && (
            <p className="text-muted-foreground/70">
              {format(new Date(evt.timestamp), 'MMM dd, HH:mm')}
            </p>
          )}
        </div>
      ),
    },
  ]

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
    <>
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

        {/* Tabs */}
        <Tabs defaultValue="configuration" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="configuration">
              <Webhook className="w-4 h-4 mr-2 hidden sm:inline-block" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="routing">
              <Settings2 className="w-4 h-4 mr-2 hidden sm:inline-block" />
              Event Routing
            </TabsTrigger>
            <TabsTrigger value="test">
              <Zap className="w-4 h-4 mr-2 hidden sm:inline-block" />
              Test & Map
            </TabsTrigger>
            <TabsTrigger value="history" onClick={() => {
              if (webhookHistory.length === 0 && !historyLoading) fetchWebhookHistory()
            }}>
              <Activity className="w-4 h-4 mr-2 hidden sm:inline-block" />
              History
            </TabsTrigger>
          </TabsList>

          {/* ===== TAB 1: Configuration ===== */}
          <TabsContent value="configuration" className="space-y-6 mt-6">
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
                        <Input value={webhookConfig.webhookUrl} readOnly className="font-mono text-xs" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookConfig.webhookUrl, 'Webhook URL')}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Webhook Secret</Label>
                      <div className="flex items-center gap-2">
                        <Input value={webhookConfig.webhookSecret} readOnly className="font-mono text-xs" type="password" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookConfig.webhookSecret, 'Webhook Secret')}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {/* {webhookConfig.webhookPath && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Webhook Path</Label>
                        <Input value={webhookConfig.webhookPath} readOnly className="font-mono text-xs" />
                      </div>
                    )} */}
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
                        Include the webhook secret in the <code className="bg-muted px-1 rounded">X-Webhook-Key</code> header for authentication.
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
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                        ) : (
                          <><Webhook className="mr-2 h-4 w-4" />Generate Webhook URL</>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* How it works info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">How Webhooks Work</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { step: '1', title: 'Receive', desc: 'External systems (ERP, FIRS) send events to your webhook URL via HTTP POST' },
                    { step: '2', title: 'Route', desc: 'Events are matched against your configured event mappings and routed to the appropriate workflow' },
                    { step: '3', title: 'Process', desc: 'The workflow processes the event: transforms, validates, signs, and transmits the invoice data' },
                  ].map((s) => (
                    <div key={s.step} className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {s.step}
                        </div>
                        <span className="font-medium">{s.title}</span>
                      </div>
                      <p className="text-muted-foreground text-xs">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TAB 2: Event Routing ===== */}
          <TabsContent value="routing" className="space-y-6 mt-6">
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
                        <Select value={mapping.eventType} onValueChange={(val) => updateMapping(index, 'eventType', val)} disabled={!canUpdate}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select event..." /></SelectTrigger>
                          <SelectContent>
                            {INBOUND_EVENT_TYPES.map((evt) => (
                              <SelectItem key={evt.value} value={evt.value}>
                                <span>{evt.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="hidden md:flex items-center justify-center">
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </div>

                        <Select value={mapping.workflow} onValueChange={(val) => updateMapping(index, 'workflow', val)} disabled={!canUpdate}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select workflow..." /></SelectTrigger>
                          <SelectContent>
                            {WORKFLOWS.map((wf) => (
                              <SelectItem key={wf.value} value={wf.value}>
                                <span>{wf.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center justify-center">
                          <Switch checked={mapping.enabled} onCheckedChange={(val) => updateMapping(index, 'enabled', val)} disabled={!canUpdate} />
                        </div>

                        {canUpdate && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeMapping(index)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}

                    {canUpdate && (
                      <div className="flex justify-end pt-2">
                        <Button onClick={handleSaveMappings} disabled={savingMappings}>
                          {savingMappings ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Mappings'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {eventMappings.filter((m) => m.eventType && m.workflow && m.enabled).length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-sm font-medium mb-3">Active Routes Summary</p>
                      <div className="flex flex-wrap gap-2">
                        {eventMappings
                          .filter((m) => m.eventType && m.workflow && m.enabled)
                          .map((m, i) => (
                            <Badge key={i} variant="secondary" className="text-xs py-1 px-3">
                              {getEventLabel(m.eventType)} → {getWorkflowLabel(m.workflow)}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== TAB 3: Test & Map ===== */}
          <TabsContent value="test" className="space-y-6 mt-6">
            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setTestMode('manual')
                  if (isListening) handleStopListening()
                }}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors',
                  testMode === 'manual'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/40 bg-card'
                )}
              >
                <div className={cn(
                  'mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                  testMode === 'manual' ? 'bg-primary/10' : 'bg-muted'
                )}>
                  <Zap className={cn('w-4 h-4', testMode === 'manual' ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <div>
                  <p className="font-medium text-sm">Manual Input</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Paste a JSON payload and send it as a test event to your webhook
                  </p>
                </div>
              </button>

              <button
                onClick={() => setTestMode('listen')}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors',
                  testMode === 'listen'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/40 bg-card'
                )}
              >
                <div className={cn(
                  'mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                  testMode === 'listen' ? 'bg-primary/10' : 'bg-muted'
                )}>
                  <Radio className={cn('w-4 h-4', testMode === 'listen' ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <div>
                  <p className="font-medium text-sm">Listen to Events</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Open a live stream and capture real events as they arrive at your webhook
                  </p>
                </div>
              </button>
            </div>

            {/* Mode: Manual Input */}
            {testMode === 'manual' && (
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Manual Test</CardTitle>
                      <CardDescription>
                        Send a custom JSON payload to your webhook endpoint
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Test Payload (JSON)</Label>
                    <textarea
                      value={customPayload}
                      onChange={(e) => setCustomPayload(e.target.value)}
                      placeholder='{"event": "erp.invoice.created", "data": {"invoiceNumber": "INV-001", "amount": 50000, "currency": "NGN", "customer": {"name": "Acme Ltd", "tin": "12345678"}}}'
                      className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use a default test payload. Paste an invoice JSON to test field mapping.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {/*      <Button onClick={handleTest} disabled={isTesting || !webhookConfig}>
                      {isTesting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
                      ) : (
                        <><Zap className="mr-2 h-4 w-4" />{testResult ? 'Retry Test' : 'Send Test Payload'}</>
                      )}
                    </Button> */}
                    <Button onClick={handlePastePayload} variant="outline" disabled={!customPayload.trim()}>
                      <Link2 className="mr-2 h-4 w-4" />
                      Map Payload Fields
                    </Button>
                  </div>

                  {!webhookConfig && (
                    <p className="text-xs text-muted-foreground">
                      Generate a webhook URL in the Configuration tab first.
                    </p>
                  )}

                  {testResult && (
                    <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2">
                        {testPassed
                          ? <CheckCircle2 className="h-5 w-5 text-success" />
                          : <XCircle className="h-5 w-5 text-destructive" />}
                        <span className={`font-medium ${testPassed ? 'text-success' : 'text-destructive'}`}>
                          {testPassed ? 'Test Passed' : 'Test Failed'}
                        </span>
                      </div>
                      {testResult.webhookUrl && (
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Webhook URL:</span>
                          <p className="text-xs font-mono bg-muted p-2 rounded">{testResult.webhookUrl}</p>
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
                      {testPassed && receivedPayload && (
                        <Button size="sm" onClick={handleOpenMapper}>
                          <Link2 className="w-4 h-4 mr-2" />
                          Map Fields to FIRS Schema
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Mode: Listen to Events */}
            {testMode === 'listen' && (
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center',
                        isListening ? 'bg-success/10' : 'bg-primary/10'
                      )}>
                        <Radio className={cn('w-4 h-4', isListening ? 'text-success' : 'text-primary')} />
                      </div>
                      <div>
                        <CardTitle className="text-base">Live Event Listener</CardTitle>
                        <CardDescription>
                          Connect to your webhook stream and capture incoming events in real time
                        </CardDescription>
                      </div>
                    </div>
                    {isListening ? (
                      <Button onClick={handleStopListening} variant="destructive" size="sm">
                        <StopCircle className="mr-2 h-4 w-4" />
                        Stop Listening
                      </Button>
                    ) : (
                      <Button onClick={handleStartListening} disabled={!webhookConfig} size="sm">
                        <Radio className="mr-2 h-4 w-4" />
                        Start Listening
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!webhookConfig && (
                    <Alert>
                      <Webhook className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Generate a webhook URL in the Configuration tab before listening for events.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Connection status bar */}
                  <div className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg border',
                    isListening
                      ? listenerConnected ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'
                      : 'border-border bg-muted/30'
                  )}>
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      {isListening && (
                        <span className={cn(
                          'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                          listenerConnected ? 'bg-success' : 'bg-warning'
                        )} />
                      )}
                      <span className={cn(
                        'relative inline-flex rounded-full h-2.5 w-2.5',
                        isListening
                          ? listenerConnected ? 'bg-success' : 'bg-warning'
                          : 'bg-muted-foreground/30'
                      )} />
                    </span>
                    <span className="text-sm">
                      {!isListening && 'Not connected'}
                      {isListening && !listenerConnected && 'Connecting to event stream...'}
                      {isListening && listenerConnected && 'Connected : listening for events'}
                    </span>
                    {isListening && (
                      <Badge variant="outline" className="text-[10px] ml-auto">
                        {listenedEvents.length} event{listenedEvents.length !== 1 ? 's' : ''} received
                      </Badge>
                    )}
                  </div>

                  {/* Received events feed */}
                  {listenedEvents.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">Received Events</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-muted-foreground"
                          onClick={() => setListenedEvents([])}
                        >
                          Clear
                        </Button>
                      </div>
                      <ScrollArea className="max-h-[400px]">
                        <div className="space-y-2 pr-2">
                          {listenedEvents.map((evt, idx) => (
                            <div key={idx} className="p-3 rounded-lg border bg-card">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px]">
                                    {evt.eventType || evt.event || 'event'}
                                  </Badge>
                                  {evt.eventId && (
                                    <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                                      {evt.eventId}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                  {evt._receivedAt ? format(new Date(evt._receivedAt), 'HH:mm:ss') : ''}
                                </span>
                              </div>
                              <pre className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto max-h-[120px]">
                                {JSON.stringify(evt.data || evt.payload || evt, null, 2)}
                              </pre>
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                onClick={() => {
                                  setReceivedPayload(evt.payload || evt.data || evt)
                                  handleOpenMapper()
                                }}
                              >
                                <Link2 className="w-3 h-3 mr-2" />
                                Map this Event
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : isListening ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-3">
                        <Radio className="w-5 h-5 text-primary/50 animate-pulse" />
                      </div>
                      <p className="text-sm text-muted-foreground">Waiting for incoming events...</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Send a request to your webhook URL to see it appear here
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {/* Field Mapping Section */}
            {showMapper && (
              <FieldMapper
                sourceFields={sourceFields}
                targetFields={targetFields}
                mappingData={mappingData}
                firsLoading={firsLoading}
                onAddMapping={addFieldMapping}
                onRemoveBySource={removeFieldMappingBySource}
                onRemoveByTarget={removeFieldMappingByTarget}
                onClearAll={() => setMappingData([])}
                onSave={handleSaveFieldMappings}
                saving={savingFieldMappings}
                onClose={() => setShowMapper(false)}
              />
            )}
          </TabsContent>

          {/* ===== TAB 4: History ===== */}
          <TabsContent value="history" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Activity className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle>Webhook History</CardTitle>
                      <CardDescription>Recent webhook events from your outbound invoices</CardDescription>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchWebhookHistory} disabled={historyLoading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${historyLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={webhookHistory}
                  columns={historyColumns}
                  isLoading={historyLoading}
                  emptyMessage="No webhook events found. Events will appear here after invoices are processed."
                  onRowClick={(evt) => setSelectedEvent(evt)}
                  searchPlaceholder="Search events..."
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Webhook Event Details</DialogTitle>
            <DialogDescription>
              {selectedEvent?.eventType} : {selectedEvent?.invoiceNumber || selectedEvent?.invoiceIrn || 'N/A'}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Event Type</p>
                  <p className="text-sm font-mono">{selectedEvent.eventType}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Status</p>
                  <StatusBadge status={selectedEvent.status} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Invoice</p>
                  <p className="text-sm font-mono">{selectedEvent.invoiceIrn || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Timestamp</p>
                  <p className="text-sm">
                    {selectedEvent.timestamp
                      ? format(new Date(selectedEvent.timestamp), 'PPpp')
                      : 'N/A'}
                  </p>
                </div>
                {selectedEvent.eventId && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-muted-foreground">Event ID</p>
                    <p className="text-sm font-mono">{selectedEvent.eventId}</p>
                  </div>
                )}
              </div>

              {selectedEvent.payload && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Payload</p>
                  <pre className="text-xs font-mono bg-muted p-3 rounded-lg overflow-auto max-h-[200px]">
                    {JSON.stringify(selectedEvent.payload, null, 2)}
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReceivedPayload(selectedEvent.payload)
                      setSelectedEvent(null)
                      handleOpenMapper()
                    }}
                  >
                    <Link2 className="w-3 h-3 mr-2" />
                    Map this Payload
                  </Button>
                </div>
              )}

              {selectedEvent.response && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Response</p>
                  <pre className="text-xs font-mono bg-muted p-3 rounded-lg overflow-auto max-h-[200px]">
                    {JSON.stringify(selectedEvent.response, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ===== Field Mapper Component =====

function FieldMapper({
  sourceFields,
  targetFields,
  mappingData,
  firsLoading,
  onAddMapping,
  onRemoveBySource,
  onRemoveByTarget,
  onClearAll,
  onSave,
  saving,
  onClose,
}: {
  sourceFields: { key: string; type: string }[]
  targetFields: { key: string; type: string; required?: boolean; description?: string }[]
  mappingData: MappingRule[]
  firsLoading: boolean
  onAddMapping: (source: string, target: string) => void
  onRemoveBySource: (source: string) => void
  onRemoveByTarget: (target: string) => void
  onClearAll: () => void
  onSave: () => void
  saving: boolean
  onClose: () => void
}) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [sourceSearch, setSourceSearch] = useState('')
  const [targetSearch, setTargetSearch] = useState('')

  const filteredSource = useMemo(() => {
    if (!sourceSearch) return sourceFields
    const q = sourceSearch.toLowerCase()
    return sourceFields.filter((f) => f.key.toLowerCase().includes(q))
  }, [sourceSearch, sourceFields])

  const filteredTarget = useMemo(() => {
    if (!targetSearch) return targetFields
    const q = targetSearch.toLowerCase()
    return targetFields.filter((f) => f.key.toLowerCase().includes(q))
  }, [targetSearch, targetFields])

  const getMappingsForSource = (key: string) => mappingData.filter((m) => m.source === key)
  const getMappingsForTarget = (key: string) => mappingData.filter((m) => m.target === key)

  // Auto-connect when both source and target are selected
  useEffect(() => {
    if (selectedSource && selectedTarget) {
      onAddMapping(selectedSource, selectedTarget)
      setSelectedSource(null)
      setSelectedTarget(null)
    }
  }, [selectedSource, selectedTarget])

  if (firsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-3" />
          <span className="text-muted-foreground">Loading FIRS schema fields...</span>
        </CardContent>
      </Card>
    )
  }

  if (sourceFields.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Link2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Source Fields</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Send a test payload or paste a JSON payload above to generate source fields for mapping.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (targetFields.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileJson className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">FIRS Schema Not Found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            The FIRS UBL Invoice Schema has not been configured yet. Ask your admin to set it up from the FIRS Dictionary page.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Field Mapping</CardTitle>
            <CardDescription>
              Click a source field, then click a target field to create a mapping
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button size="sm" onClick={onSave} disabled={saving}>
              {saving ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Saving...</> : 'Save Mappings'}
            </Button>
          </div>
        </div>

        {/* Mapping stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
          <span>{sourceFields.length} source fields</span>
          <span>-</span>
          <span>{targetFields.length} target fields</span>
          <span>-</span>
          <Badge variant="secondary">{mappingData.length} mappings</Badge>
          {mappingData.length > 0 && (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onClearAll}>
              <Unlink className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* Source Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Server className="w-4 h-4" />
                Webhook Payload Fields
              </CardTitle>
              <Input
                placeholder="Search source fields..."
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
                className="mt-2"
              />
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="space-y-0.5 p-3">
                  {filteredSource.map((field) => {
                    const mappings = getMappingsForSource(field.key)
                    const isMapped = mappings.length > 0
                    const isSelected = selectedSource === field.key
                    return (
                      <div
                        key={field.key}
                        className={cn(
                          'flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors text-sm group',
                          isSelected && 'bg-primary/10 border border-primary/30',
                          isMapped && !isSelected && 'bg-success/5 border border-success/20',
                          !isMapped && !isSelected && 'hover:bg-muted/50 border border-transparent'
                        )}
                        onClick={() => setSelectedSource(isSelected ? null : field.key)}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <code className="text-xs font-mono truncate">{field.key}</code>
                          <Badge variant="outline" className="text-[10px] shrink-0">{field.type}</Badge>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isMapped && <Badge variant="secondary" className="text-[10px]">{mappings.length}</Badge>}
                          {isMapped && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onRemoveBySource(field.key) }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 rounded"
                            >
                              <Unlink className="w-3 h-3 text-destructive" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Target Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileJson className="w-4 h-4" />
                FIRS UBL Fields
              </CardTitle>
              <Input
                placeholder="Search target fields..."
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
                className="mt-2"
              />
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="space-y-0.5 p-3">
                  {filteredTarget.map((field) => {
                    const mappings = getMappingsForTarget(field.key)
                    const isMapped = mappings.length > 0
                    const isSelected = selectedTarget === field.key
                    return (
                      <div
                        key={field.key}
                        className={cn(
                          'flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors text-sm group',
                          isSelected && 'bg-primary/10 border border-primary/30',
                          isMapped && !isSelected && 'bg-success/5 border border-success/20',
                          !isMapped && !isSelected && 'hover:bg-muted/50 border border-transparent'
                        )}
                        onClick={() => setSelectedTarget(isSelected ? null : field.key)}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <code className="text-xs font-mono truncate">{field.key}</code>
                          <Badge variant="outline" className="text-[10px] shrink-0">{field.type}</Badge>
                          {field.required && <Badge variant="destructive" className="text-[10px] shrink-0">req</Badge>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isMapped && <Badge variant="secondary" className="text-[10px]">{mappings.length}</Badge>}
                          {isMapped && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onRemoveByTarget(field.key) }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 rounded"
                            >
                              <Unlink className="w-3 h-3 text-destructive" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Current mappings summary */}
        {mappingData.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-3">Current Mappings ({mappingData.length})</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
              {mappingData.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-2 rounded border bg-muted/30">
                  <code className="font-mono truncate flex-1">{m.source}</code>
                  <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                  <code className="font-mono truncate flex-1">{m.target}</code>
                  <button
                    onClick={() => onRemoveBySource(m.source)}
                    className="p-0.5 hover:bg-destructive/10 rounded shrink-0"
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
