'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, ClipboardCheck } from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { Progress } from '@/components/ui/progress'
import {
  OnboardingStepper,
  NrsOAuthStep,
  NrsCredentialsStep,
  WebhookGenerateStep,
  OnboardingComplete,
} from '@/components/onboarding'
import type { OnboardingStep } from '@/components/onboarding'
import { SectionLoader } from '@/components/shared/SectionLoader'

const STEP_KEYS = ['firs_oauth', 'firs_credentials', 'webhook_generate'] as const
type StepKey = typeof STEP_KEYS[number]
const KEY_ALIAS = {
  firs_oauth: "firsProvisioning",
  firs_credentials: "firsProvisioning",

}
const STEP_META: Record<StepKey, { label: string; description: string }> = {
  firs_oauth: { label: 'NRS Auth', description: 'Authenticate with NRS portal' },
  firs_credentials: { label: 'Credentials', description: 'Provide NRS certificate & key' },
  webhook_generate: { label: 'Webhook', description: 'Generate webhook URL' },
}

export default function OnboardingPage() {
  const { tenantId, tenantData, onboardingSteps, isOnboardingComplete, metadata: tenantMetadata, isLoading, error, refetch } = useTenant()
  const [currentStepOverride, setCurrentStepOverride] = useState<StepKey | null>(null)
  const [onboardingProgress, setOnboardingProgress] = useState(0)
  // Check if a backend step value means "completed"
  // Handles: true, { completed: true }, "completed", { status: "completed" }
  const isStepCompleted = (value: unknown): boolean => {
    if (value === true) return true
    if (typeof value === 'string') return value === 'completed'
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>
      return obj.completed === true || obj.status === 'completed'
    }
    return false
  }

  // Determine step statuses from backend onboarding steps
  // On re-login, useTenant() fetches /me which returns saved onboarding.steps — so
  // users automatically resume from where they left off.
  const steps: OnboardingStep[] = useMemo(() => {
    let foundCurrent = false
    return STEP_KEYS.map((key) => {
      let backendKey = KEY_ALIAS[key]
      const backendStep = onboardingSteps?.[backendKey]

      if (isStepCompleted(backendStep)) {
        return { key, ...STEP_META[key], status: 'completed' as const }
      }

      if (key == 'webhook_generate' && tenantMetadata && tenantMetadata.webhookUrl) {
        return { key, ...STEP_META[key], status: 'completed' as const }
      }

      if (!foundCurrent) {
        foundCurrent = true
        return { key, ...STEP_META[key], status: 'current' as const }
      }

      return { key, ...STEP_META[key], status: 'pending' as const }
    })
  }, [onboardingSteps])

  useEffect(() => {
    let total = steps.length,
      completed = steps.reduce((_, curr) => curr.status == 'completed' ? _ += 1 : _ += 0, 0)
    let progress = Math.floor((completed / total) * 100)
    setOnboardingProgress(progress)
  }, [steps])
  // Current active step:
  // 1. Override from user click or auto-advance after step complete
  // 2. First non-completed step from backend (resume on re-login)
  // 3. Fallback to first step
  const activeStepKey = currentStepOverride
    ?? (steps.find((s) => s.status === 'current')?.key as StepKey | undefined)
    ?? STEP_KEYS[0]

  const handleStepComplete = () => {
    // Find the next step after the currently active one
    const currentIndex = STEP_KEYS.indexOf(activeStepKey)
    const nextStepKey = STEP_KEYS[currentIndex + 1] as StepKey | undefined

    if (nextStepKey) {
      // Immediately advance to next step
      setCurrentStepOverride(nextStepKey)
    } else {
      // All steps done — clear override so isOnboardingComplete takes over
      setCurrentStepOverride(null)
    }

    // Sync backend state in the background (updates stepper UI + progress %)
    refetch()
  }

  const handleStepClick = (stepKey: string) => {
    const step = steps.find((s) => s.key === stepKey)
    if (step?.status === 'completed') {
      setCurrentStepOverride(stepKey as StepKey)
    }
  }

  if (isLoading) {
    return <SectionLoader message="Loading onboarding" />
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-lg mx-auto mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load onboarding data. Please refresh the page.
        </AlertDescription>
      </Alert>
    )
  }

  if (isOnboardingComplete) {
    const businessName = tenantData && 'businessName' in tenantData ? (tenantData as any).businessName : undefined
    return (
      <div className="max-w-2xl mx-auto">
        <OnboardingComplete businessName={businessName} />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6" />
          Account Onboarding
        </h1>
        <p className="text-muted-foreground">
          Complete the steps below to activate your e-invoicing account.
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{onboardingProgress}%</span>
          </div>
          <Progress value={onboardingProgress} />
          <OnboardingStepper steps={steps} onStepClick={handleStepClick} />
        </CardContent>
      </Card>

      {/* Active Step */}
      <Card>
        <CardHeader>
          <CardTitle>{STEP_META[activeStepKey].label}</CardTitle>
          <CardDescription>{STEP_META[activeStepKey].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {tenantId && activeStepKey === 'firs_oauth' && (
            <NrsOAuthStep tenantId={tenantId} onStepComplete={handleStepComplete} />
          )}
          {tenantId && activeStepKey === 'firs_credentials' && (
            <NrsCredentialsStep tenantId={tenantId} onStepComplete={handleStepComplete} />
          )}
          {tenantId && activeStepKey === 'webhook_generate' && (
            <WebhookGenerateStep tenantId={tenantId} onStepComplete={handleStepComplete} />
          )}
          {!tenantId && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Unable to determine your tenant ID. Please try logging out and back in.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
