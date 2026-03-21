'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from '@/hooks/use-session'
import { useTenant } from '@/hooks/use-tenant'
import { TenantSidebar } from '@/components/layout/TenantSidebar'
import { Header } from '@/components/layout/Header'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { FullScreenLoader } from '@/components/shared/FullScreenLoader'

export default function DashboardLayoutBase({
    children,
}: {
    children: React.ReactNode
}) {
    const { isAuthenticated, isLoading, isSuperAdmin, isBusinessAdmin, isBusinessTeamMember } = useSession()
    const { isOnboardingComplete, isLoading: isTenantLoading } = useTenant()
    const router = useRouter()
    const pathname = usePathname()
    const isMobile = useIsMobile()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    // Auth redirect
    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.push('/auth/login')
            } else if (isSuperAdmin) {
                router.push('/admin')
            } else if (!isBusinessAdmin && !isBusinessTeamMember) {
                router.push('/auth/login')
            }
        }
    }, [isAuthenticated, isLoading, isSuperAdmin, isBusinessAdmin, isBusinessTeamMember, router])

    // Onboarding redirect — if not complete, send to onboarding page
    useEffect(() => {
        if (
            !isLoading &&
            !isTenantLoading &&
            isAuthenticated &&
            (isBusinessAdmin || isBusinessTeamMember) &&
            !isOnboardingComplete &&
            pathname &&
            !pathname.startsWith('/dashboard/onboarding')
        ) {
            router.push('/dashboard/onboarding')
        }
    }, [isLoading, isTenantLoading, isAuthenticated, isBusinessAdmin, isBusinessTeamMember, isOnboardingComplete, pathname, router])

    if (isLoading || isTenantLoading) {
        return <FullScreenLoader />
    }

    if (!isAuthenticated || isSuperAdmin || (!isBusinessAdmin && !isBusinessTeamMember)) {
        return null
    }

    return (
        <div className="h-screen flex bg-background overflow-hidden">
            <TenantSidebar
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
                />
                <div className={cn('p-8', isMobile && 'pt-4')}>
                    {children}
                </div>
            </main>
        </div>
    )
}
