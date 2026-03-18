'use client'

import { ReactNode, useEffect } from 'react'
import { ThemeSwitcher } from '@/components/shared/ThemeSwitcher'
import { useSession } from '@/hooks/use-session'
import { FullScreenLoader } from '@/components/shared/FullScreenLoader'
import { useRouter } from 'next/navigation'

interface SuperAdminAuthLayoutProps {
  children: ReactNode
}

export default function SuperAdminAuthLayout({ children }: SuperAdminAuthLayoutProps) {
    const { isAuthenticated, isLoading } = useSession()
    const router = useRouter()
    // Redirect to login if not authenticated
    useEffect(() => {
      if (!isLoading && isAuthenticated) {
        router.push('/admin')
      }
    }, [isAuthenticated, isLoading, router])
    if (isLoading) {
        return <FullScreenLoader />
      }
  return (
    <div>
    {children}
  </div>
  )
}
