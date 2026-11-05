'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useSession } from '@/hooks/use-session'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { Header } from '@/components/layout/Header'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { FullScreenLoader } from '@/components/shared/FullScreenLoader'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { isAuthenticated, isLoading, isSuperAdmin, isPlatformAdmin, user } = useSession()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const isMobile = useIsMobile()

  // Redirect to login if not authenticated, or to their own dashboard if
  // authenticated as a role that has no business under /admin at all.
  // Platform admins are further restricted to /admin/monitoring specifically
  // by middleware (isRouteAccessible) — this layout only decides who gets in
  // the door, not which pages behind it they can reach.
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/auth/super-admin/login')
      } else if (!isSuperAdmin && !isPlatformAdmin) {
        router.push('/dashboard')
      }
    }
  }, [isAuthenticated, isLoading, isSuperAdmin, isPlatformAdmin, router])

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true)
    } else {
      setSidebarCollapsed(false)
    }
  }, [isMobile])

  // Show loading state or nothing while checking auth
  if (isLoading) {
    return <FullScreenLoader />
  }

  // Don't render admin content if not authenticated, or authenticated as a
  // role with no access to anything under /admin
  if (!isAuthenticated || (!isSuperAdmin && !isPlatformAdmin)) {
    return null
  }

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <AdminSidebar
        isOpen={!isMobile || sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <Header
          isMobile={isMobile}
          onMenuClick={() => setSidebarOpen(true)}
          isCollapsed={sidebarCollapsed}
          onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          logoutCallbackUrl={isPlatformAdmin ? '/auth/platform-admin/login' : '/auth/super-admin/login'}
        />
        <div className={cn('p-8', isMobile && 'pt-4')}>{children}</div>
      </main>
    </div>
  )
}
