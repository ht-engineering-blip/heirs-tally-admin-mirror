'use client'

import { useSession as useNextAuthSession } from 'next-auth/react'

export function useSession() {
  const { data: session, status } = useNextAuthSession()

  return {
    session,
    user: session?.user,
    tenantId: session?.user?.tenantId,
    memberRole: session?.user?.role,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    isSuperAdmin: session?.user?.role === 'SUPER_ADMIN',
    isBusinessAdmin: session?.user?.role === 'BUSINESS_ADMIN',
    isBusinessTeamMember: session?.user?.role === 'BUSINESS_TEAM_MEMBER',
  }
}
