'use client'

import { useSession } from './use-session'

export type Permission =
  | 'system:configure'
  | 'system:view'
  | 'tenants:create'
  | 'tenants:read'
  | 'tenants:update'
  | 'tenants:delete'
  | 'tenants:activate'
  | 'tenants:suspend'
  | 'erp:configure'
  | 'erp:view'
  | 'api-keys:create'
  | 'api-keys:read'
  | 'api-keys:rotate'
  | 'api-keys:revoke'
  | 'sandbox:test'

const SUPER_ADMIN_PERMISSIONS: Permission[] = [
  'system:configure',
  'system:view',
  'tenants:create',
  'tenants:read',
  'tenants:update',
  'tenants:delete',
  'tenants:activate',
  'tenants:suspend',
  'erp:configure',
  'erp:view',
  'api-keys:create',
  'api-keys:read',
  'api-keys:rotate',
  'api-keys:revoke',
  'sandbox:test',
]

const BUSINESS_ADMIN_PERMISSIONS: Permission[] = [
  'tenants:read',
  'api-keys:read',
  'erp:view',
]

function getPermissionsForRole(role: 'SUPER_ADMIN' | 'BUSINESS_ADMIN' | undefined): Permission[] {
  if (!role) return []
  
  switch (role) {
    case 'SUPER_ADMIN':
      return SUPER_ADMIN_PERMISSIONS
    case 'BUSINESS_ADMIN':
      return BUSINESS_ADMIN_PERMISSIONS
    default:
      return []
  }
}

export function usePermissions() {
  const { user } = useSession()
  const permissions = getPermissionsForRole(user?.role)

  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission)
  }

  const hasAnyPermission = (permissionList: Permission[]): boolean => {
    return permissionList.some((permission) => permissions.includes(permission))
  }

  const hasAllPermissions = (permissionList: Permission[]): boolean => {
    return permissionList.every((permission) => permissions.includes(permission))
  }

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  }
}
