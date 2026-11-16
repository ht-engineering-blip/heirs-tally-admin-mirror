'use client'

import { useEffect, useState } from 'react'
import { MailWarning, Save } from 'lucide-react'
import { EmailListInput } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/sonner'
import { createTenantApi } from '@/lib/api/tenant-api'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'

const MAX_RECIPIENTS = 50

export default function AlertRecipientsPage() {
  const { tenantId } = useTenant()
  const { hasPermission } = usePermissions()
  const canUpdate = hasPermission('settings:update')

  const [recipients, setRecipients] = useState<string[]>([])
  const [savedRecipients, setSavedRecipients] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!tenantId) return
    const fetchRecipients = async () => {
      setIsLoading(true)
      try {
        const api = createTenantApi()
        const response = await api.getWorkflowFailureRecipients(tenantId)
        if (response.error) {
          toast.error((response.error as any)?.value?.error || 'Failed to load alert recipients')
        } else {
          const list = (response.data as any)?.data?.recipients || []
          setRecipients(list)
          setSavedRecipients(list)
        }
      } catch (error: any) {
        toast.error(error?.message || 'Failed to load alert recipients')
      } finally {
        setIsLoading(false)
      }
    }
    fetchRecipients()
  }, [tenantId])

  // Dirty-check: only enable Save once the list actually differs from what's
  // on file, order included — a no-op PUT would just round-trip the same value.
  const isDirty =
    recipients.length !== savedRecipients.length ||
    recipients.some((email, i) => email !== savedRecipients[i])

  const handleSave = async () => {
    if (!tenantId) return
    setIsSaving(true)
    try {
      const api = createTenantApi()
      const response = await api.updateWorkflowFailureRecipients(tenantId, recipients)
      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to save alert recipients')
      } else {
        setSavedRecipients(recipients)
        toast.success('Alert recipients saved')
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save alert recipients')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Alert Recipients</h1>
            <p className="text-sm text-muted-foreground">
              Who gets emailed when your invoice processing fails
            </p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-2/3" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Alert Recipients</h1>
          <p className="text-sm text-muted-foreground">
            Who gets emailed when your invoice processing fails
          </p>
        </div>
        {canUpdate && (
          <Button onClick={handleSave} disabled={!isDirty || isSaving} className="rounded-full">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MailWarning className="w-4 h-4" />
            Workflow-failure email recipients
          </CardTitle>
          <CardDescription>
            These addresses are emailed when an invoice fails processing. Add up to {MAX_RECIPIENTS} addresses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailListInput
            value={recipients}
            onChange={setRecipients}
            max={MAX_RECIPIENTS}
            disabled={!canUpdate}
            placeholder="name@company.com"
          />
          {!canUpdate && (
            <p className="text-xs text-muted-foreground mt-3">
              You don&apos;t have permission to change alert recipients.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
