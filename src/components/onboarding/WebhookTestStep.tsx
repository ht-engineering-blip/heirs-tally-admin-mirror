'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Zap, AlertCircle, Loader2, CheckCircle2, ArrowRight, XCircle } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { createTenantApi } from '@/lib/api/tenant-api'

interface WebhookTestStepProps {
  tenantId: string
  onStepComplete: () => void
}

interface TestResult {
  webhookUrl: string
  testResult: any
  payload: Record<string, unknown>
}

export function WebhookTestStep({ tenantId, onStepComplete }: WebhookTestStepProps) {
  const [error, setError] = useState<string | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testPassed, setTestPassed] = useState(false)

  const handleTest = async () => {
    setIsTesting(true)
    setError(null)
    setTestResult(null)

    try {
      const tenantApi = createTenantApi()
      const response = await tenantApi.testWebhook(tenantId)

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Webhook test failed'
        setError(errorMessage)
        toast.error(errorMessage)
        setIsTesting(false)
        return
      }

      const responseData = (response.data as any)?.data
      if (!responseData) {
        setError('Unexpected response')
        toast.error('Unexpected response')
        setIsTesting(false)
        return
      }

      setTestResult(responseData)

      // Determine if test passed based on testResult
      const passed = responseData.testResult?.success !== false
      setTestPassed(passed)

      if (passed) {
        toast.success('Webhook test passed!')
        const activationRespo = await tenantApi.completeOnboading(tenantId,{
          status: 'active',
        })
        if (activationRespo.error) {
          const errorMessage = (activationRespo.error as any)?.value?.error || ''
          setError(errorMessage)
          toast.error(errorMessage)
          setIsTesting(false)
          return
        }

        const responseData = (activationRespo.data as any)?.data
        if (!responseData) {
          setError('Unexpected response')
          toast.error('Unexpected response')
          setIsTesting(false)
          return
        }

        onStepComplete()
      } else {
        toast.error('Webhook test failed. Please check your configuration.')
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to test webhook'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Test Webhook
        </h3>
        <p className="text-sm text-muted-foreground">
          Send a test payload to your webhook URL to verify it's receiving events correctly.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {testResult && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {testPassed ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              Test Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className={`text-sm font-medium ${testPassed ? 'text-success' : 'text-destructive'}`}>
                {testPassed ? 'Passed' : 'Failed'}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Webhook URL:</span>
              <p className="text-xs font-mono bg-muted p-2 rounded">{testResult.webhookUrl}</p>
            </div>
            {testResult.testResult && (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Response:</span>
                <pre className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto max-h-[200px]">
                  {JSON.stringify(testResult.testResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {testPassed ? (
        <Alert className="border-success bg-success/10">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            Webhook test passed! Your webhook is configured correctly.
          </AlertDescription>
        </Alert>
      ) : (
        <Button onClick={handleTest} className="w-full" disabled={isTesting}>
          {isTesting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending test payload...
            </>
          ) : (
            <>
              {testResult ? 'Retry Test' : 'Send Test Payload'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </div>
  )
}
