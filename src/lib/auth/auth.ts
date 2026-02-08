import { authOptions } from './config'
import NextAuth from 'next-auth'

export const { auth, signIn, signOut } = NextAuth(authOptions)
