'use client'

import { Shield } from 'lucide-react'
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
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
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
