'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ClipboardCheck, ArrowRight } from 'lucide-react'

interface OnboardingBannerProps {
  progress: number
  status: string | null
}

export function OnboardingBanner({ progress, status }: OnboardingBannerProps) {
  const router = useRouter()

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <ClipboardCheck className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Complete your onboarding to start processing invoices</p>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
        <Button
          size="sm"
          onClick={() => router.push('/dashboard/onboarding')}
        >
          Continue
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  )
}
