'use client'

import { useSession as useNextAuthSession } from 'next-auth/react'

export function useSession() {
  const { data: session, status } = useNextAuthSession()

  return {
    session,
    user: session?.user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    isSuperAdmin: session?.user?.role === 'SUPER_ADMIN',
    isBusinessAdmin: session?.user?.role === 'BUSINESS_ADMIN',
  }
}
