import { NextAuthConfig } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { validateLoginKey } from '@/lib/mockData/auth'

export const authOptions: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: 'Login Key',
      credentials: {
        loginKey: {
          label: 'Login Key',
          type: 'text',
          placeholder: 'Enter your login key',
        },
      },
      async authorize(credentials) {
        if (!credentials?.loginKey) {
          return null
        }

        const user = validateLoginKey(credentials?.loginKey as string)

        if (!user) {
          return null
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
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
      }
      return token
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.name = token.name || ''
        session.user.email = token.email || undefined
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'heirs-tally-super-admin-secret-key-change-in-production',
}
