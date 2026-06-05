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
        memberRole: {
          label: 'Member Role',
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

        // Handle token-based authentication (for tenant/team members).
        // The backend JWT is stored in the access_token browser cookie — not in
        // the session — so credentials only carry identity fields here.
        if (credentials?.email) {
          return {
            id: credentials.email as string,
            name: credentials.name as string || 'User',
            email: credentials.email as string,
            role: credentials.role as User['role'] || 'BUSINESS_TEAM_MEMBER',
            tenantId: credentials.tenantId as string || undefined,
            memberRole: credentials.memberRole as string || undefined,
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
    signIn: '/auth/login',
    error: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.name = user.name
        token.email = user.email
        if ((user as any).tenantId) {
          token.tenantId = (user as any).tenantId
        }
        if ((user as any).memberRole) {
          token.memberRole = (user as any).memberRole
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
        session.user.memberRole = token.memberRole || undefined
      }
      return session
    },
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
}
