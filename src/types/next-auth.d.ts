import 'next-auth'
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'SUPER_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_TEAM_MEMBER'
      /** Permission level within the tenant: 'admin' | 'member' | 'viewer' — only set for BUSINESS_TEAM_MEMBER */
      memberRole?: string
      name: string
      email?: string
      tenantId?: string
    } & DefaultSession['user']
  }

  interface User {
    id: string
    role: 'SUPER_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_TEAM_MEMBER'
    memberRole?: string
    name: string
    email?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'SUPER_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_TEAM_MEMBER'
    memberRole?: string
    name: string
    email?: string
    token?: string // API token for tenant/team member authentication
    tenantId?: string
  }
}
