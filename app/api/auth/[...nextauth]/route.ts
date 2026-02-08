import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth/config'

const { handlers } = NextAuth(authOptions)

export const { GET, POST } = handlers
