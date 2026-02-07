'use client'

import { ReactNode } from 'react'
import { ThemeSwitcher } from '@/components/shared/ThemeSwitcher'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Theme Switcher - Top Right */}
      <div className="absolute bottom-4 right-4 z-10">
        <ThemeSwitcher variant="icon" />
      </div>

      {/* Auth Content */}
      <div className="min-h-screen flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
