'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings2, Plug } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { useTenant } from '@/hooks/use-tenant'
import { createTenantApi } from '@/lib/api/tenant-api'
import { SectionLoader } from '@/components/shared/SectionLoader'
import { ErpSyncForm, ErpSyncDefaultValues, ErpSyncPayload } from '@/components/shared/ErpSyncForm'

export default function ErpSyncPage() {
  const { tenantId, tenantData, isLoading: tenantLoading } = useTenant()
  const [config, setConfig] = useState<any>(null)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [syncDefaultValues, setSyncDefaultValues] = useState<ErpSyncDefaultValues | undefined>()

  const erpSystem = (tenantData as any)?.erpSystem || ''

  const buildDefaultValues = (c: any): ErpSyncDefaultValues => ({
    name: c.name,
    description: c.description,
    enabled: c.enabled !== false,
    method: c.method,
    baseUrl: c.baseUrl,
    endpoint: c.endpoint,
    timeout: c.timeout,
    bodyTemplate: c.bodyTemplate,
    headers: c.headers,
    queryParams: c.queryParams,
    authentication: c.authentication,
    retryConfig: c.retryConfig,
    responseMapping: c.responseMapping,
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
        setSyncDefaultValues(buildDefaultValues(c))
      } else {
        setConfig(null)
        setSyncDefaultValues(undefined)
      }
    } catch {
      setConfig(null)
    } finally {
      setIsLoadingConfig(false)
    }
  }

  useEffect(() => {
    if (tenantId) fetchConfig()
  }, [tenantId])

  const handleSubmit = async (payload: ErpSyncPayload) => {
    if (!tenantId) return
    setIsSaving(true)
    try {
      const api = createTenantApi()
      const res = await api.saveErpSyncConfig(tenantId, payload)
      if (res.error) {
        toast.error((res.error as any)?.value?.error || 'Failed to save ERP sync config')
      } else {
        toast.success('ERP sync configuration saved')
        setIsEditing(false)
        fetchConfig()
      }
    } catch {
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
      const res = await api.saveErpSyncConfig(tenantId, { ...config, enabled: newEnabled })
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

  if (tenantLoading || isLoadingConfig) {
    return <SectionLoader message="Loading ERP sync" />
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Plug className="h-5 w-5 sm:h-6 sm:w-6" />
            ERP Sync Configuration
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure how your ERP system syncs with the e-invoicing platform.
          </p>
        </div>
        {erpSystem && <Badge variant="outline" className="w-fit">{erpSystem}</Badge>}
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
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>{config.name || 'ERP Sync'}</CardTitle>
                <CardDescription>{config.description || 'Sync configuration'}</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={config.enabled ? 'default' : 'secondary'}>
                  {config.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
                <Button variant="outline" size="sm" onClick={handleToggleEnabled} disabled={isSaving}>
                  {config.enabled ? 'Disable' : 'Enable'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
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
          </CardContent>
        </Card>
      )}

      {/* Edit / Create Form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>{config ? 'Edit Configuration' : 'New ERP Sync Configuration'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ErpSyncForm
              defaultValues={syncDefaultValues}
              isSaving={isSaving}
              onSubmit={handleSubmit}
              onCancel={() => setIsEditing(false)}
              submitLabel={config ? 'Update Configuration' : 'Save Configuration'}
            />
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
      <div className={`mt-1 text-sm break-all ${mono ? 'font-mono' : ''}`}>{value || 'N/A'}</div>
    </div>
  )
}
