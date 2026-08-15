'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

const AUTH_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api-key', label: 'API Key' },
  { value: 'oauth2', label: 'OAuth 2.0' },
] as const

export const erpSyncSchema = z.object({
  name: z.string().min(1, 'Config name is required'),
  description: z.string().optional(),
  enabled: z.boolean(),
  method: z.enum(HTTP_METHODS),
  baseUrl: z.string().url('Must be a valid URL'),
  endpoint: z.string().min(1, 'Endpoint is required'),
  timeout: z.coerce.number().min(1000).max(300000).optional(),
  bodyTemplate: z.string().optional(),
  authType: z.enum(['none', 'basic', 'bearer', 'api-key', 'oauth2'] as const),
  authToken: z.string().optional(),
  authUsername: z.string().optional(),
  authPassword: z.string().optional(),
  authApiKeyName: z.string().optional(),
  authApiKeyValue: z.string().optional(),
  authApiKeyLocation: z.enum(['header', 'query']).optional(),
  maxRetries: z.coerce.number().min(0).max(10).optional(),
  retryDelay: z.coerce.number().min(100).max(30000).optional(),
})

export type ErpSyncFormValues = z.infer<typeof erpSyncSchema>

export interface ErpSyncPayload {
  name: string
  description?: string
  enabled: boolean
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  baseUrl: string
  endpoint: string
  timeout?: number
  bodyTemplate?: string
  headers?: Record<string, string>
  queryParams?: Record<string, string>
  authentication?: {
    type: 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2'
    token?: string
    username?: string
    password?: string
    apiKeyName?: string
    apiKeyValue?: string
    apiKeyLocation?: 'header' | 'query'
  }
  retryConfig?: { maxRetries: number; retryDelay: number }
  responseMapping?: Record<string, string>
}

export interface ErpSyncDefaultValues {
  name?: string
  description?: string
  enabled?: boolean
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  baseUrl?: string
  endpoint?: string
  timeout?: number
  bodyTemplate?: string
  headers?: Record<string, string>
  queryParams?: Record<string, string>
  authentication?: {
    type?: string
    token?: string
    username?: string
    password?: string
    apiKeyName?: string
    apiKeyValue?: string
    apiKeyLocation?: 'header' | 'query'
  }
  retryConfig?: { maxRetries?: number; retryDelay?: number }
  responseMapping?: Record<string, string>
}

interface ErpSyncFormProps {
  /** Pre-fill the form when editing an existing config */
  defaultValues?: ErpSyncDefaultValues
  isSaving: boolean
  onSubmit: (payload: ErpSyncPayload) => void
  onCancel: () => void
  /** Optional slot rendered at the top of the Basic tab (e.g. Tenant + ERP Type selectors on admin) */
  topSlot?: React.ReactNode
  submitLabel?: string
}

const objectToEntries = (obj?: Record<string, string>): Array<{ key: string; value: string }> =>
  obj ? Object.entries(obj).map(([key, value]) => ({ key, value })) : []

const entriesToObject = (entries: Array<{ key: string; value: string }>): Record<string, string> => {
  const obj: Record<string, string> = {}
  entries.forEach(({ key, value }) => { if (key.trim()) obj[key.trim()] = value })
  return obj
}

export function ErpSyncForm({
  defaultValues,
  isSaving,
  onSubmit,
  onCancel,
  topSlot,
  submitLabel = 'Save Configuration',
}: ErpSyncFormProps) {
  const [headersText, setHeadersText] = useState(
    defaultValues?.headers
      ? JSON.stringify(defaultValues.headers, null, 2)
      : JSON.stringify({ 'Content-Type': 'application/json' }, null, 2)
  )
  const [queryParamsText, setQueryParamsText] = useState(
    defaultValues?.queryParams ? JSON.stringify(defaultValues.queryParams, null, 2) : ''
  )
  const [responseMappingEntries, setResponseMappingEntries] = useState<Array<{ key: string; value: string }>>(
    objectToEntries(defaultValues?.responseMapping)
  )

  const form = useForm<ErpSyncFormValues>({
    resolver: zodResolver(erpSyncSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      enabled: defaultValues?.enabled ?? true,
      method: defaultValues?.method ?? 'POST',
      baseUrl: defaultValues?.baseUrl ?? '',
      endpoint: defaultValues?.endpoint ?? '',
      timeout: defaultValues?.timeout ?? 30000,
      bodyTemplate: defaultValues?.bodyTemplate ?? '{\n  "invoiceRef": "{{irn}}",\n  "erpId": "{{erpInvoiceId}}",\n  "status": "Validated",\n  "qrCode": "{{qrCode}}",\n  "invoiceType": "{{invoice_type}}"\n}',
      authType: (defaultValues?.authentication?.type as any) ?? 'none',
      authToken: defaultValues?.authentication?.token ?? '',
      authUsername: defaultValues?.authentication?.username ?? '',
      authPassword: defaultValues?.authentication?.password ?? '',
      authApiKeyName: defaultValues?.authentication?.apiKeyName ?? '',
      authApiKeyValue: defaultValues?.authentication?.apiKeyValue ?? '',
      authApiKeyLocation: defaultValues?.authentication?.apiKeyLocation ?? 'header',
      maxRetries: defaultValues?.retryConfig?.maxRetries ?? 3,
      retryDelay: defaultValues?.retryConfig?.retryDelay ?? 1000,
    },
  })

  // Re-populate when defaultValues change (e.g. opening a different record)
  useEffect(() => {
    if (!defaultValues) return
    form.reset({
      name: defaultValues.name ?? '',
      description: defaultValues.description ?? '',
      enabled: defaultValues.enabled ?? true,
      method: defaultValues.method ?? 'POST',
      baseUrl: defaultValues.baseUrl ?? '',
      endpoint: defaultValues.endpoint ?? '',
      timeout: defaultValues.timeout ?? 30000,
      bodyTemplate: defaultValues.bodyTemplate ?? '{"invoice": {{invoice}}}',
      authType: (defaultValues.authentication?.type as any) ?? 'none',
      authToken: defaultValues.authentication?.token ?? '',
      authUsername: defaultValues.authentication?.username ?? '',
      authPassword: defaultValues.authentication?.password ?? '',
      authApiKeyName: defaultValues.authentication?.apiKeyName ?? '',
      authApiKeyValue: defaultValues.authentication?.apiKeyValue ?? '',
      authApiKeyLocation: defaultValues.authentication?.apiKeyLocation ?? 'header',
      maxRetries: defaultValues.retryConfig?.maxRetries ?? 3,
      retryDelay: defaultValues.retryConfig?.retryDelay ?? 1000,
    })
    setHeadersText(
      defaultValues.headers
        ? JSON.stringify(defaultValues.headers, null, 2)
        : JSON.stringify({ 'Content-Type': 'application/json' }, null, 2)
    )
    setQueryParamsText(defaultValues.queryParams ? JSON.stringify(defaultValues.queryParams, null, 2) : '')
    setResponseMappingEntries(objectToEntries(defaultValues.responseMapping))
  }, [defaultValues])

  const handleSubmit = (data: ErpSyncFormValues) => {
    let headers: Record<string, string> | undefined
    let queryParams: Record<string, string> | undefined

    if (headersText.trim()) {
      try { headers = JSON.parse(headersText) } catch { form.setError('root', { message: 'Invalid JSON in headers' }); return }
    }
    if (queryParamsText.trim()) {
      try { queryParams = JSON.parse(queryParamsText) } catch { form.setError('root', { message: 'Invalid JSON in query params' }); return }
    }

    const authentication = data.authType !== 'none' ? {
      type: data.authType,
      ...(data.authType === 'bearer' && { token: data.authToken }),
      ...(data.authType === 'basic' && { username: data.authUsername, password: data.authPassword }),
      ...(data.authType === 'api-key' && { apiKeyName: data.authApiKeyName, apiKeyValue: data.authApiKeyValue, apiKeyLocation: data.authApiKeyLocation }),
    } : undefined

    const responseMapping = Object.keys(entriesToObject(responseMappingEntries)).length > 0
      ? entriesToObject(responseMappingEntries)
      : undefined

    onSubmit({
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
      retryConfig: (data.maxRetries != null || data.retryDelay != null) ? {
        maxRetries: data.maxRetries ?? 3,
        retryDelay: data.retryDelay ?? 1000,
      } : undefined,
      responseMapping,
    })
  }

  const authType = form.watch('authType')
  const method = form.watch('method')
  const rootError = form.formState.errors.root?.message

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs defaultValue="basic">
          <TabsList className="mb-4 w-full flex overflow-x-auto">
            <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic</TabsTrigger>
            <TabsTrigger value="request" className="text-xs sm:text-sm">Request</TabsTrigger>
            <TabsTrigger value="auth" className="text-xs sm:text-sm">Auth</TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs sm:text-sm">Advanced</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4">
            {topSlot}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <FormDescription>Use tokens like {'{{irn}}'}, {'{{erpInvoiceId}}'}, {'{{qrCode}}'}, {'{{invoice_type}}'} as placeholders</FormDescription>
                <FormControl>
                  <Textarea placeholder={'{\n  "invoiceRef": "{{irn}}",\n  "erpId": "{{erpInvoiceId}}",\n  "status": "Validated",\n  "qrCode": "{{qrCode}}",\n  "invoiceType": "{{invoice_type}}"\n}'} rows={6} className="font-mono text-sm" {...field} />
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
                    {AUTH_TYPES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label>Response Mapping</Label>
              <div className="space-y-2">
                {responseMappingEntries.map((entry, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Response field path"
                      value={entry.key}
                      onChange={(e) => {
                        const updated = [...responseMappingEntries]
                        updated[index].key = e.target.value
                        setResponseMappingEntries(updated)
                      }}
                    />
                    <Input
                      placeholder="Map to field"
                      value={entry.value}
                      onChange={(e) => {
                        const updated = [...responseMappingEntries]
                        updated[index].value = e.target.value
                        setResponseMappingEntries(updated)
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setResponseMappingEntries(responseMappingEntries.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="w-4 h-4" />
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
          </TabsContent>
        </Tabs>

        {rootError && <p className="text-sm text-destructive">{rootError}</p>}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
