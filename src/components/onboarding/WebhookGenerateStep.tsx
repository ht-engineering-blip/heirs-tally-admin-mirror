'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Webhook, AlertCircle, Loader2, CheckCircle2, Copy, ArrowRight } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { createTenantApi } from '@/lib/api/tenant-api'

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

export function WebhookGenerateStep({ tenantId, onStepComplete }: WebhookGenerateStepProps) {
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
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
        setIsGenerating(false)
        return
      }

      const responseData = (response.data as any)?.data
      if (!responseData?.webhookUrl) {
        setError('Unexpected response')
        toast.error('Unexpected response')
        setIsGenerating(false)
        return
      }

      setWebhookData(responseData)
      toast.success('Webhook URL generated!')

      // Mark onboarding as complete
      const activationResponse = await tenantApi.completeOnboading(tenantId, {
        status: 'active',
      })
      if (activationResponse.error) {
        const activationError = (activationResponse.error as any)?.value?.error || 'Failed to activate account'
        setError(activationError)
        toast.error(activationError)
        setIsGenerating(false)
        return
      }

      onStepComplete()
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to generate webhook URL'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsGenerating(false)
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
