import { NextAuthConfig, User } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { validateLoginKey } from '@/lib/mockData/auth'
import { JWT } from 'next-auth/jwt'

export const authOptions: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        loginKey: {
          label: 'Login Key',
          type: 'text',
          placeholder: 'Enter your login key',
        },
        token: {
          label: 'Token',
          type: 'text',
        },
        email: {
          label: 'Email',
          type: 'text',
        },
        name: {
          label: 'Name',
          type: 'text',
        },
        role: {
          label: 'Role',
          type: 'text',
        },
        tenantId: {
          label: 'Tenant ID',
          type: 'text',
        },
      },
      async authorize(credentials): Promise<User | JWT | null> {
        // Handle login key (for super admin)
        if (credentials?.loginKey) {
          const user = validateLoginKey(credentials.loginKey as string)
          if (!user) {
            return null
          }
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        }

        // Handle token-based authentication (for tenant/team members)
        if (credentials?.token) {
          // Token is already validated by the calling page
          // Just return the user data from credentials, including the token
          return {
            id: credentials.email as string || credentials.token as string,
            name: credentials.name as string || 'User',
            email: credentials.email as string || undefined,
            role: credentials.role as User['role'] || 'BUSINESS_TEAM_MEMBER',
            token: credentials.token as string,
            tenantId: credentials.tenantId as string || undefined,
          }
        }

        return null
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/super-admin/login',
    error: '/auth/super-admin/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.name = user.name
        token.email = user.email
        // Store the API token so the proxy can read it from the JWT
        if ((user as any).token) {
          token.token = (user as any).token
        }
        if ((user as any).tenantId) {
          token.tenantId = (user as any).tenantId
        }
      }
      return token
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.name = token.name || ''
        session.user.email = token.email || undefined
        session.user.tenantId = token.tenantId || undefined
      }
      return session
    },
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET || 'heirs-tally-super-admin-secret-key-change-in-production',
}
