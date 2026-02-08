'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { useSession } from '@/hooks/use-session'
 
/**
 * Generic hook for admin API calls
 */
export function useAdminApi() {
  const { isAuthenticated } = useSession()

  return api
}
