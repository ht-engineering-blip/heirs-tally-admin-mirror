export interface PlatformAdminUser {
  userId: string
  email: string
  firstName: string
  lastName: string
  status: 'active' | 'suspended'
  modulePermissions: string[]
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface PlatformAdminLoginResponse {
  success: true
  data: {
    token: string
    tokenType: 'Bearer'
    expiresIn: string
    user: PlatformAdminUser
  }
}

export interface PlatformAdminMeResponse {
  success: true
  data: {
    type: 'platform_admin'
    user: Pick<PlatformAdminUser, 'email' | 'firstName' | 'lastName' | 'modulePermissions'> & { id: string }
  }
}

export interface PlatformAdminRefreshResponse {
  success: true
  data: { token: string; tokenType: 'Bearer'; expiresIn: string }
}

// Account provisioning — requires the literal x-admin-key, not a platform
// admin's own bearer token (see docs/platform-admin-and-monitoring-api-contract.md §2).
export interface PlatformAdminSummary {
  userId: string
  email: string
  firstName: string
  lastName: string
  status: 'active' | 'suspended'
  modulePermissions: string[]
  createdBy: string
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreatePlatformAdminPayload {
  email: string
  firstName: string
  lastName: string
  password: string
  modulePermissions: string[]
}

export interface UpdatePlatformAdminPayload {
  firstName?: string
  lastName?: string
  password?: string
  status?: 'active' | 'suspended'
  modulePermissions?: string[]
}
