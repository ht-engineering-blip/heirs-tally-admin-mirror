'use client'

import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface OnboardingStep {
  key: string
  label: string
  description: string
  status: 'completed' | 'current' | 'pending'
}

interface OnboardingStepperProps {
  steps: OnboardingStep[]
  onStepClick?: (stepKey: string) => void
}

export function OnboardingStepper({ steps, onStepClick }: OnboardingStepperProps) {
  return (
    <nav aria-label="Onboarding progress">
      <ol className="flex items-center w-full">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1
          const isClickable = step.status === 'completed' && onStepClick

          return (
            <li
              key={step.key}
              className={cn('flex items-center', !isLast && 'flex-1')}
            >
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.key)}
                disabled={!isClickable}
                className={cn(
                  'flex flex-col items-center gap-1.5 group',
                  isClickable && 'cursor-pointer'
                )}
              >
                {/* Circle */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                    step.status === 'completed' && 'bg-success border-success text-success-foreground',
                    step.status === 'current' && 'border-primary bg-primary/10 text-primary',
                    step.status === 'pending' && 'border-muted-foreground/30 text-muted-foreground/50'
                  )}
                >
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                {/* Label */}
                <span
                  className={cn(
                    'text-xs font-medium text-center max-w-[80px] leading-tight',
                    step.status === 'completed' && 'text-success',
                    step.status === 'current' && 'text-foreground',
                    step.status === 'pending' && 'text-muted-foreground/50'
                  )}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 mt-[-20px]',
                    step.status === 'completed' ? 'bg-success' : 'bg-muted-foreground/20'
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
