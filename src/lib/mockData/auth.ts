/**
 * Mock authentication data
 * In production, this would be replaced with database queries
 */

export interface AuthUser {
  id: string
  loginKey: string
  role: 'SUPER_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_TEAM_MEMBER'
  name: string
  email?: string
}

export const validLoginKeys: AuthUser[] = [
  {
    id: '1',
    loginKey: 'super-admin-key-2024',
    role: 'SUPER_ADMIN',
    name: 'Super Admin',
    email: 'superadmin@heirstally.com',
  },
  {
    id: '2',
    loginKey: 'business-admin-key-2024',
    role: 'BUSINESS_ADMIN',
    name: 'Business Admin',
    email: 'businessadmin@heirstally.com',
  },
  {
    id: '3',
    loginKey: 'business-team-member-key-2024',
    role: 'BUSINESS_TEAM_MEMBER',
    name: 'Business Team Member',
    email: 'teammember@heirstally.com',
  },
]

/**
 * Validate login key and return user if valid
 */
export function validateLoginKey(loginKey: string): AuthUser | null {
  const user = validLoginKeys.find((u) => u.loginKey === loginKey)
  return user || null
}

/**
 * Get user by ID
 */
export function getUserById(id: string): AuthUser | null {
  return validLoginKeys.find((u) => u.id === id) || null
}
