'use client'

import { Logo } from '@/components/shared/Logo'
import { cn } from '@/lib/utils'

interface FullScreenLoaderProps {
  message?: string
  className?: string
}

export function FullScreenLoader({ message = 'Loading', className }: FullScreenLoaderProps) {
  return (
    <div className={cn('h-screen flex flex-col items-center justify-center gap-6 bg-background', className)}>
      <div className="relative flex items-center justify-center">
        {/* Outer spinning ring */}
        <div className="absolute w-16 h-16 rounded-full border-2 border-muted-foreground/20 border-t-primary animate-spin" />
        {/* Logo icon */}
        <Logo asLink={false} width={40} height={40} imageClassName="rounded-full" />
      </div>
      <div className="flex items-center gap-1.5">
        <p className="text-sm text-muted-foreground font-medium">{message}</p>
        <span className="flex gap-0.5">
          <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
          <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
          <span className="w-1 h-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  )
}
