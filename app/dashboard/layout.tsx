'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/use-session'
import { DashboardLayout } from '@/components/layout'

export default function DashboardLayoutBase({
    children,
}: {
    children: React.ReactNode
}) {
    const { isAuthenticated, isLoading, isSuperAdmin, isBusinessAdmin, isBusinessTeamMember } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.push('/auth/login')
            } else if (isSuperAdmin) {
                // Super admin should use /admin dashboard
                router.push('/admin')
            } else if (!isBusinessAdmin && !isBusinessTeamMember) {
                // Only business admin and team members can access this dashboard
                router.push('/auth/login')
            }
        }
    }, [isAuthenticated, isLoading, isSuperAdmin, isBusinessAdmin, isBusinessTeamMember, router])

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        )
    }

    if (!isAuthenticated || isSuperAdmin || (!isBusinessAdmin && !isBusinessTeamMember)) {
        return null
    }

    return (
        <DashboardLayout>
            {children}
        </DashboardLayout>
    )
}
