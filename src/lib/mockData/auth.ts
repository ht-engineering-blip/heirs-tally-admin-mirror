/**
 * Super admin authentication
 * Login key is read from SUPER_ADMIN_LOGIN_KEY env var
 */

export interface AuthUser {
  id: string
  loginKey: string
  role: 'SUPER_ADMIN'
  name: string
  email?: string
}

/**
 * Validate login key and return user if valid
 */
export function validateLoginKey(loginKey: string): AuthUser | null {
  const validKey = process.env.SUPER_ADMIN_LOGIN_KEY
  if (!validKey || loginKey !== validKey) return null

  return {
    id: '1',
    loginKey: validKey,
    role: 'SUPER_ADMIN',
    name: 'Super Admin',
    email: process.env.SUPER_ADMIN_EMAIL,
  }
}
