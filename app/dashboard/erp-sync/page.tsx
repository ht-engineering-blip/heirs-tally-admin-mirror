'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Loader2,
  RefreshCw,
  Settings2,
  CheckCircle,
  AlertCircle,
  Plug,
  Shield,
  Zap,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { useTenant } from '@/hooks/use-tenant'
import { createTenantApi } from '@/lib/api/tenant-api'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

const AUTH_TYPES = ['none', 'basic', 'bearer', 'api-key', 'oauth2'] as const

const TRIGGER_EVENTS = [
  { value: 'invoice.validated', label: 'Invoice Validated' },
  { value: 'invoice.signed', label: 'Invoice Signed' },
  { value: 'invoice.transmitted', label: 'Invoice Transmitted' },
  { value: 'invoice.received', label: 'Invoice Received' },
  { value: 'invoice.acknowledged', label: 'Invoice Acknowledged' },
] as const

const erpSyncSchema = z.object({
  name: z.string().min(1, 'Config name is required'),
  description: z.string().optional(),
  enabled: z.boolean(),
  method: z.enum(HTTP_METHODS),
  baseUrl: z.string().url('Must be a valid URL'),
  endpoint: z.string().min(1, 'Endpoint is required'),
  timeout: z.coerce.number().min(1000).max(60000).optional(),
  bodyTemplate: z.string().optional(),
  authType: z.enum(AUTH_TYPES),
  authToken: z.string().optional(),
  authUsername: z.string().optional(),
  authPassword: z.string().optional(),
  authApiKeyName: z.string().optional(),
  authApiKeyValue: z.string().optional(),
  authApiKeyLocation: z.enum(['header', 'query']).optional(),
  maxRetries: z.coerce.number().min(0).max(10).optional(),
  retryDelay: z.coerce.number().min(100).max(30000).optional(),
})

type ErpSyncFormValues = z.infer<typeof erpSyncSchema>

export default function ErpSyncPage() {
  const { tenantId, tenantData, isLoading: tenantLoading } = useTenant()
  const [config, setConfig] = useState<any>(null)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [triggerEvents, setTriggerEvents] = useState<string[]>([])
  const [headersText, setHeadersText] = useState('')
  const [queryParamsText, setQueryParamsText] = useState('')

  const erpSystem = (tenantData as any)?.erpSystem || ''

  const form = useForm<ErpSyncFormValues>({
    resolver: zodResolver(erpSyncSchema),
    defaultValues: {
      name: '',
      description: '',
      enabled: true,
      method: 'POST',
      baseUrl: '',
      endpoint: '',
      timeout: 30000,
      bodyTemplate: '',
      authType: 'none',
      authToken: '',
      authUsername: '',
      authPassword: '',
      authApiKeyName: '',
      authApiKeyValue: '',
      authApiKeyLocation: 'header',
      maxRetries: 3,
      retryDelay: 1000,
    },
  })

  const fetchConfig = async () => {
    if (!tenantId) return
    setIsLoadingConfig(true)
    try {
      const api = createTenantApi()
      const res = await api.getErpSyncConfig(tenantId)
      if (!res.error && res.data?.data) {
        const c = res.data.data as any
        setConfig(c)
        populateForm(c)
      } else {
        setConfig(null)
      }
    } catch {
      setConfig(null)
    } finally {
      setIsLoadingConfig(false)
    }
  }

  const populateForm = (c: any) => {
    form.reset({
      name: c.name || '',
      description: c.description || '',
      enabled: c.enabled !== false,
      method: c.method || 'POST',
      baseUrl: c.baseUrl || '',
      endpoint: c.endpoint || '',
      timeout: c.timeout || 30000,
      bodyTemplate: c.bodyTemplate || '',
      authType: c.authentication?.type || 'none',
      authToken: c.authentication?.token || '',
      authUsername: c.authentication?.username || '',
      authPassword: c.authentication?.password || '',
      authApiKeyName: c.authentication?.apiKeyName || '',
      authApiKeyValue: c.authentication?.apiKeyValue || '',
      authApiKeyLocation: c.authentication?.apiKeyLocation || 'header',
      maxRetries: c.retryConfig?.maxRetries ?? 3,
      retryDelay: c.retryConfig?.retryDelay ?? 1000,
    })
    setTriggerEvents(c.triggerEvents || [])
    setHeadersText(c.headers ? JSON.stringify(c.headers, null, 2) : '')
    setQueryParamsText(c.queryParams ? JSON.stringify(c.queryParams, null, 2) : '')
  }

  useEffect(() => {
    if (tenantId) fetchConfig()
  }, [tenantId])

  const onSubmit = async (data: ErpSyncFormValues) => {
    if (!tenantId) return
    setIsSaving(true)

    try {
      let headers: Record<string, string> | undefined
      let queryParams: Record<string, string> | undefined

      if (headersText.trim()) {
        try { headers = JSON.parse(headersText) } catch { toast.error('Invalid JSON in headers'); setIsSaving(false); return }
      }
      if (queryParamsText.trim()) {
        try { queryParams = JSON.parse(queryParamsText) } catch { toast.error('Invalid JSON in query params'); setIsSaving(false); return }
      }

      const authentication = data.authType !== 'none' ? {
        type: data.authType,
        ...(data.authType === 'bearer' && { token: data.authToken }),
        ...(data.authType === 'basic' && { username: data.authUsername, password: data.authPassword }),
        ...(data.authType === 'api-key' && { apiKeyName: data.authApiKeyName, apiKeyValue: data.authApiKeyValue, apiKeyLocation: data.authApiKeyLocation }),
      } : undefined

      const payload = {
        name: data.name,
        description: data.description || undefined,
        enabled: data.enabled,
        method: data.method,
        baseUrl: data.baseUrl,
        endpoint: data.endpoint,
        timeout: data.timeout || undefined,
        bodyTemplate: data.bodyTemplate || undefined,
        headers,
        queryParams,
        authentication: authentication as any,
        retryConfig: (data.maxRetries || data.retryDelay) ? {
          maxRetries: data.maxRetries || 3,
          retryDelay: data.retryDelay || 1000,
        } : undefined,
        triggerEvents: triggerEvents.length > 0 ? triggerEvents as any : undefined,
      }

      const api = createTenantApi()
      const res = await api.saveErpSyncConfig(tenantId, payload)

      if (res.error) {
        toast.error((res.error as any)?.value?.error || 'Failed to save ERP sync config')
      } else {
        toast.success('ERP sync configuration saved')
        setIsEditing(false)
        fetchConfig()
      }
    } catch (err) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleEnabled = async () => {
    if (!tenantId || !config) return
    const newEnabled = !config.enabled
    setIsSaving(true)
    try {
      const api = createTenantApi()
      const res = await api.saveErpSyncConfig(tenantId, {
        ...config,
        enabled: newEnabled,
      })
      if (res.error) {
        toast.error('Failed to update sync status')
      } else {
        toast.success(newEnabled ? 'Sync enabled' : 'Sync disabled')
        fetchConfig()
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const authType = form.watch('authType')

  if (tenantLoading || isLoadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading ERP sync configuration...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plug className="h-6 w-6" />
            ERP Sync Configuration
          </h1>
          <p className="text-muted-foreground">
            Configure how your ERP system syncs with the e-invoicing platform.
          </p>
        </div>
        {erpSystem && <Badge variant="outline">{erpSystem}</Badge>}
      </div>

      {/* No Config State */}
      {!config && !isEditing && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No ERP Sync Configured</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Set up your ERP sync configuration to automatically sync invoices between your ERP system and the platform.
            </p>
            <Button onClick={() => setIsEditing(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Configure ERP Sync
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Existing Config View */}
      {config && !isEditing && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{config.name || 'ERP Sync'}</CardTitle>
                  <CardDescription>{config.description || 'Sync configuration'}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.enabled ? 'default' : 'secondary'}>
                    {config.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={handleToggleEnabled} disabled={isSaving}>
                    {config.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setIsEditing(true); populateForm(config) }}>
                    Edit
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ConfigField label="HTTP Method" value={<Badge variant="outline">{config.method}</Badge>} />
                <ConfigField label="Base URL" value={config.baseUrl} />
                <ConfigField label="Endpoint" value={config.endpoint} mono />
                <ConfigField label="Timeout" value={config.timeout ? `${config.timeout}ms` : 'Default'} />
                <ConfigField label="Auth Type" value={config.authentication?.type || 'None'} />
                {config.retryConfig && (
                  <ConfigField
                    label="Retry"
                    value={`${config.retryConfig.maxRetries} retries, ${config.retryConfig.retryDelay}ms delay`}
                  />
                )}
              </div>
              {config.triggerEvents && config.triggerEvents.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Trigger Events</p>
                  <div className="flex flex-wrap gap-2">
                    {config.triggerEvents.map((event: string) => (
                      <Badge key={event} variant="secondary">{event}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Edit / Create Form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{config ? 'Edit Configuration' : 'New ERP Sync Configuration'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="basic">
                  <TabsList className="mb-4">
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="request">Request</TabsTrigger>
                    <TabsTrigger value="auth">Authentication</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>

                  {/* Basic Tab */}
                  <TabsContent value="basic" className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Configuration Name</FormLabel>
                        <FormControl><Input placeholder="e.g. SAP Invoice Sync" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl><Input placeholder="Optional description" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="enabled" render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <FormLabel>Enable Sync</FormLabel>
                          <FormDescription>Enable or disable this sync configuration</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )} />
                  </TabsContent>

                  {/* Request Tab */}
                  <TabsContent value="request" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="method" render={({ field }) => (
                        <FormItem>
                          <FormLabel>HTTP Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {HTTP_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="timeout" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timeout (ms)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="baseUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base URL</FormLabel>
                        <FormControl><Input placeholder="https://api.your-erp.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="endpoint" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endpoint</FormLabel>
                        <FormControl><Input placeholder="/api/v1/invoices" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div>
                      <label className="text-sm font-medium">Headers (JSON)</label>
                      <Textarea
                        placeholder='{"Content-Type": "application/json"}'
                        value={headersText}
                        onChange={(e) => setHeadersText(e.target.value)}
                        rows={3}
                        className="font-mono text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Query Params (JSON)</label>
                      <Textarea
                        placeholder='{"format": "json"}'
                        value={queryParamsText}
                        onChange={(e) => setQueryParamsText(e.target.value)}
                        rows={3}
                        className="font-mono text-sm mt-1"
                      />
                    </div>
                    <FormField control={form.control} name="bodyTemplate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Body Template</FormLabel>
                        <FormDescription>Use {'{{invoice}}'} as placeholder for invoice data</FormDescription>
                        <FormControl>
                          <Textarea placeholder='{"data": {{invoice}}}' rows={4} className="font-mono text-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </TabsContent>

                  {/* Auth Tab */}
                  <TabsContent value="auth" className="space-y-4">
                    <FormField control={form.control} name="authType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Authentication Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="bearer">Bearer Token</SelectItem>
                            <SelectItem value="basic">Basic Auth</SelectItem>
                            <SelectItem value="api-key">API Key</SelectItem>
                            <SelectItem value="oauth2">OAuth2</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {authType === 'bearer' && (
                      <FormField control={form.control} name="authToken" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bearer Token</FormLabel>
                          <FormControl><Input type="password" placeholder="Token" {...field} /></FormControl>
                        </FormItem>
                      )} />
                    )}
                    {authType === 'basic' && (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="authUsername" render={({ field }) => (
                          <FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="authPassword" render={({ field }) => (
                          <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl></FormItem>
                        )} />
                      </div>
                    )}
                    {authType === 'api-key' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="authApiKeyName" render={({ field }) => (
                            <FormItem><FormLabel>Key Name</FormLabel><FormControl><Input placeholder="X-API-Key" {...field} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name="authApiKeyValue" render={({ field }) => (
                            <FormItem><FormLabel>Key Value</FormLabel><FormControl><Input type="password" {...field} /></FormControl></FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name="authApiKeyLocation" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Key Location</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="header">Header</SelectItem>
                                <SelectItem value="query">Query Parameter</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                      </>
                    )}
                  </TabsContent>

                  {/* Advanced Tab */}
                  <TabsContent value="advanced" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="maxRetries" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Retries</FormLabel>
                          <FormControl><Input type="number" min={0} max={10} {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="retryDelay" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Retry Delay (ms)</FormLabel>
                          <FormControl><Input type="number" min={100} max={30000} {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Trigger Events</p>
                      <p className="text-sm text-muted-foreground mb-3">Select events that trigger this sync</p>
                      <div className="space-y-2">
                        {TRIGGER_EVENTS.map((event) => (
                          <label key={event.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={triggerEvents.includes(event.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTriggerEvents([...triggerEvents, event.value])
                                } else {
                                  setTriggerEvents(triggerEvents.filter((v) => v !== event.value))
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">{event.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Configuration
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ConfigField({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="py-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className={`mt-1 text-sm ${mono ? 'font-mono' : ''}`}>{value || 'N/A'}</div>
    </div>
  )
}
