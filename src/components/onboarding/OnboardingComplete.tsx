'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface OnboardingCompleteProps {
  businessName?: string
}

export function OnboardingComplete({ businessName }: OnboardingCompleteProps) {
  const router = useRouter()

  return (
    <Card className="text-center">
      <CardContent className="pt-8 pb-8 space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Onboarding Complete!</h2>
          <p className="text-muted-foreground">
            {businessName
              ? `${businessName} has been fully onboarded.`
              : 'Your account has been fully onboarded.'}
            {' '}You're ready to start processing e-invoices.
          </p>
        </div>

        <Progress value={100} className="w-full max-w-xs mx-auto" />

        <Button onClick={() => router.push('/dashboard')} size="lg">
          Go to Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
