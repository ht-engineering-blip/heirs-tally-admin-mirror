'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SectionLoaderProps {
  message?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function SectionLoader({ message = 'Loading', className, size = 'md' }: SectionLoaderProps) {
  const sizeClasses = {
    sm: 'py-6',
    md: 'min-h-[400px]',
    lg: 'min-h-[500px]',
  }

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', sizeClasses[size], className)}>
      <div className="relative flex items-center justify-center">
        <Loader2 className={cn('text-primary animate-spin', iconSizes[size])} />
      </div>
      <div className="flex items-center gap-1.5">
        <p className="text-sm text-muted-foreground">{message}</p>
        <span className="flex gap-0.5">
          <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
          <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
          <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  )
}
