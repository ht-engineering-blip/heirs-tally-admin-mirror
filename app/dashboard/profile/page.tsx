'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Building2, AlertCircle, CheckCircle, Pencil, X, Shield, Eye, EyeOff, Copy } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { SectionLoader } from '@/components/shared/SectionLoader'
import { usePermissions } from '@/hooks/use-permissions'
import { useTenant } from '@/hooks/use-tenant'
import { createTenantApi } from '@/lib/api/tenant-api'

const profileSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().min(1, 'Phone number is required'),
})

type ProfileFormValues = z.infer<typeof profileSchema>

const credentialsSchema = z.object({
  certificate: z.string().min(1, 'Certificate is required'),
  publicKey: z.string().min(1, 'Public key is required'),
})

type CredentialsFormValues = z.infer<typeof credentialsSchema>

export default function ProfilePage() {
  const { tenantId, tenantData, metadata, isLoading, error: tenantError, refetch } = useTenant()
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission('profile:update')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showCredentials, setShowCredentials] = useState(false)
  const [isEditingCredentials, setIsEditingCredentials] = useState(false)
  const [isSavingCredentials, setIsSavingCredentials] = useState(false)

  const tenant = tenantData as Record<string, any> | undefined
  const config = tenant?.config as Record<string, any> | undefined

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: {
      businessName: tenant?.businessName || '',
      contactEmail: tenant?.contactEmail || '',
      contactPhone: tenant?.contactPhone || '',
    },
  })

  const credentialsForm = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { certificate: '', publicKey: '' },
  })

  const onSubmit = async (data: ProfileFormValues) => {
    if (!tenantId) return
    setIsSaving(true)

    try {
      const api = createTenantApi()
      const response = await api.updateTenant(tenantId, data)

      if (response.error) {
        const msg = (response.error as any)?.value?.error || 'Failed to update profile'
        toast.error(msg)
        return
      }

      toast.success('Profile updated successfully')
      setIsEditing(false)
      refetch()
    } catch (err) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const handleUpdateCredentials = async (data: CredentialsFormValues) => {
    if (!tenantId) return
    setIsSavingCredentials(true)
    try {
      const api = createTenantApi()
      const response = await api.putFirsCredentials(tenantId, data.certificate, data.publicKey)
      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to update FIRS credentials')
        return
      }
      toast.success('FIRS credentials updated successfully')
      setIsEditingCredentials(false)
      credentialsForm.reset()
      refetch()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsSavingCredentials(false)
    }
  }

  if (isLoading) {
    return <SectionLoader message="Loading profile" />
  }

  if (tenantError) {
    return (
      <Alert variant="destructive" className="max-w-lg mx-auto mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load profile data. Please refresh the page.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
            Business Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage your business information.
          </p>
        </div>
        <Badge variant={tenant?.status === 'active' ? 'default' : 'secondary'} className="w-fit">
          {tenant?.status || 'N/A'}
        </Badge>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Your registered business details</CardDescription>
            </div>
            {!isEditing ? (
              canEdit && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )
            ) : (
              <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); form.reset() }}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <ProfileField label="Business Name" value={tenant?.businessName} />
              <ProfileField label="TIN" value={tenant?.tin} />
              <ProfileField label="Contact Email" value={tenant?.contactEmail} />
              <ProfileField label="Contact Phone" value={tenant?.contactPhone} />
              <ProfileField label="ERP System" value={config?.erpSystem || tenant?.erpSystem} />
              <ProfileField label="Registered" value={tenant?.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : undefined} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Your account configuration and limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProfileField
            label="Webhook URL"
            value={config?.webhookUrl || 'Not configured'}
            copyable={!!config?.webhookUrl}
            onCopy={() => handleCopy(config?.webhookUrl, 'Webhook URL')}
          />
          <ProfileField
            label="Webhook Enabled"
            value={config?.webhookEnabled ? 'Yes' : 'No'}
          />
          {config?.features && (
            <>
              <ProfileField label="Auto Fix" value={config.features.autoFix ? 'Enabled' : 'Disabled'} />
              <ProfileField label="QR Code Generation" value={config.features.qrCodeGeneration ? 'Enabled' : 'Disabled'} />
              <ProfileField label="Max Retries" value={config.features.maxRetries?.toString()} />
            </>
          )}
          {config?.limits && (
            <>
              <ProfileField label="Monthly Invoice Limit" value={config.limits.monthlyInvoiceLimit?.toLocaleString()} />
              <ProfileField label="API Rate Limit" value={config.limits.apiRateLimit ? `${config.limits.apiRateLimit}/min` : undefined} />
            </>
          )}
        </CardContent>
      </Card>

      {/* FIRS Credentials Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                FIRS Credentials
              </CardTitle>
              <CardDescription>Your FIRS certificate and public key for invoice signing</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCredentials(!showCredentials)}
              >
                {showCredentials ? (
                  <><EyeOff className="h-4 w-4 mr-1" /> Hide</>
                ) : (
                  <><Eye className="h-4 w-4 mr-1" /> Show</>
                )}
              </Button>
              {!isEditingCredentials && canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setIsEditingCredentials(true); setShowCredentials(false) }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Update
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingCredentials ? (
            <Form {...credentialsForm}>
              <form onSubmit={credentialsForm.handleSubmit(handleUpdateCredentials)} className="space-y-4">
                <FormField
                  control={credentialsForm.control}
                  name="certificate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certificate</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                          className="font-mono text-xs min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={credentialsForm.control}
                  name="publicKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Public Key</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
                          className="font-mono text-xs min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setIsEditingCredentials(false); credentialsForm.reset() }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSavingCredentials}>
                    {isSavingCredentials && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Credentials
                  </Button>
                </div>
              </form>
            </Form>
          ) : showCredentials ? (
            <div className="space-y-4">
              <ProfileField
                label="FIRS Status"
                value={config?.firs ? 'Connected' : 'Not connected'}
              />
              {config?.firs && (
                <>
                  <ProfileField
                    label="Service ID"
                    value={config.firs.serviceId}
                  />
                  <ProfileField label="Business Name" value={tenant?.businessName} />
                  <ProfileField label="TIN" value={tenant?.tin} />
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click &quot;Show&quot; to view your FIRS credential details, or &quot;Update&quot; to replace your certificate and key.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ProfileField({
  label,
  value,
  copyable,
  onCopy,
}: {
  label: string
  value?: string
  copyable?: boolean
  onCopy?: () => void
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-left sm:text-right max-w-full sm:max-w-[300px] truncate">
          {value || 'N/A'}
        </span>
        {copyable && onCopy && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCopy}>
            <Copy className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
