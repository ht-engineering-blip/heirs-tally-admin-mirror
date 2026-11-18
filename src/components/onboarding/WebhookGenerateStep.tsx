'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Webhook, AlertCircle, Loader2, CheckCircle2, Copy, ArrowRight } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { createTenantApi } from '@/lib/api/tenant-api'
import { useTenant } from '@/hooks/use-tenant'

interface WebhookGenerateStepProps {
  tenantId: string
  onStepComplete: () => void | Promise<void>
}

interface WebhookData {
  webhookUrl: string
  webhookSecret: string
  webhookPath: string
  instructions: string
}

export function WebhookGenerateStep({ tenantId }: WebhookGenerateStepProps) {
  const router = useRouter()
  const { refetch } = useTenant()
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [webhookData, setWebhookData] = useState<WebhookData | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const tenantApi = createTenantApi()
      const response = await tenantApi.generateWebhook(tenantId)

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Failed to generate webhook URL'
        setError(errorMessage)
        toast.error(errorMessage)
        return
      }

      const responseData = (response.data as any)?.data
      if (!responseData?.webhookUrl) {
        setError('Unexpected response')
        toast.error('Unexpected response')
        return
      }

      setWebhookData(responseData)
      toast.success('Webhook URL generated!')
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to generate webhook URL'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  // Explicitly marks the erpConfiguration (webhook) step complete via its
  // own tenant-callable endpoint — deliberately separate from webhook
  // generation (which still flips it as a side effect, kept only for
  // backward compatibility) and from tenant activation, which stays an
  // admin-only action and is never called from here.
  //
  // Refetches directly via useTenant() here rather than going through the
  // parent page's onStepComplete() — that clears its currentStepOverride,
  // which flips this (the last) step to "complete" and briefly renders the
  // onboarding page's own "Onboarding Complete" card before the redirect
  // below takes over. We still need the refetch — without it the dashboard
  // layout's onboarding guard reads stale cached data and immediately
  // bounces back here — but not that intermediate screen.
  const handleCompleteOnboarding = async () => {
    setIsCompleting(true)
    setError(null)

    try {
      const tenantApi = createTenantApi()
      const response = await tenantApi.completeErpConfigurationStep(tenantId)
      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Failed to mark this step complete'
        setError(errorMessage)
        toast.error(errorMessage)
        return
      }

      await refetch()
      router.push('/dashboard')
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to complete onboarding'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsCompleting(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  if (webhookData) {
    return (
      <div className="space-y-4">
        <Alert className="border-success bg-success/10">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            Webhook URL generated successfully! Save your webhook secret — it won't be shown again.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhook Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Webhook URL</Label>
              <div className="flex items-center gap-2">
                <Input value={webhookData.webhookUrl} readOnly className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(webhookData.webhookUrl, 'Webhook URL')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Webhook Secret</Label>
              <div className="flex items-center gap-2">
                <Input value={webhookData.webhookSecret} readOnly className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(webhookData.webhookSecret, 'Webhook Secret')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {webhookData.webhookPath && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Webhook Path</Label>
                <Input value={webhookData.webhookPath} readOnly className="font-mono text-xs" />
              </div>
            )}

            {webhookData.instructions && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {webhookData.instructions}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button onClick={handleCompleteOnboarding} className="w-full" disabled={isCompleting}>
          {isCompleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Completing onboarding...
            </>
          ) : (
            <>
              Complete Onboarding
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Generate Webhook URL
        </h3>
        <p className="text-sm text-muted-foreground">
          Generate a webhook URL to receive invoice notifications from NRS. This URL will be used by NRS to send inbound invoices and status updates.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button onClick={handleGenerate} className="w-full" disabled={isGenerating}>
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating webhook URL...
          </>
        ) : (
          <>
            Generate Webhook URL
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  )
}
