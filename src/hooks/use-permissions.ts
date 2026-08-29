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
  | 'team:read'
  | 'team:invite'
  | 'team:update'
  | 'team:remove'
  | 'settings:read'
  | 'settings:update'
  | 'profile:read'
  | 'profile:update'
  | 'transactions:read'
  | 'transactions:resend'
  | 'audit:read'

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
  'team:read',
  'team:invite',
  'team:update',
  'team:remove',
  'settings:read',
  'settings:update',
  'profile:read',
  'profile:update',
  'transactions:read',
  'transactions:resend',
  'audit:read',
]

const BUSINESS_ADMIN_PERMISSIONS: Permission[] = [
  'tenants:read',
  'tenants:update',
  'erp:configure',
  'erp:view',
  'api-keys:create',
  'api-keys:read',
  'api-keys:rotate',
  'api-keys:revoke',
  'sandbox:test',
  'team:read',
  'team:invite',
  'team:update',
  'team:remove',
  'settings:read',
  'settings:update',
  'profile:read',
  'profile:update',
  'transactions:read',
  'transactions:resend',
]

export const BUSINESS_TEAM_MEMBER_PERMISSIONS: Permission[] = [
  'tenants:read',
  'erp:view',
  'sandbox:test',
  'profile:read',
  'transactions:read',
]

// Team member sub-roles within a tenant
export enum MEMBER_ROLES {
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

// admin team members can do most things but cannot manage API keys or team
// membership — those are reserved for the tenant owner (BUSINESS_ADMIN).
const TEAM_ADMIN_PERMISSIONS: Permission[] = [
  'tenants:read',
  'tenants:update',
  'erp:configure',
  'erp:view',
  'api-keys:read',       // can view keys but not create / rotate / revoke
  'sandbox:test',
  'team:read',           // can view the team list but not invite / update / remove
  'settings:read',
  'settings:update',
  'profile:read',
  'profile:update',
  'transactions:read',
  'transactions:resend',
]

// viewer team members can only read
const TEAM_VIEWER_PERMISSIONS: Permission[] = [
  'tenants:read',
  'profile:read',
  'transactions:read',
]

function getPermissionsForRole(role: 'SUPER_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_TEAM_MEMBER' | undefined): Permission[] {
  if (!role) return []

  switch (role) {
    case 'SUPER_ADMIN':
      return SUPER_ADMIN_PERMISSIONS
    case 'BUSINESS_ADMIN':
      return BUSINESS_ADMIN_PERMISSIONS
    case 'BUSINESS_TEAM_MEMBER':
      return BUSINESS_TEAM_MEMBER_PERMISSIONS
    default:
      return []
  }
}

function getTeamMemberPermissions(memberRole: string | undefined): Permission[] {
  switch (memberRole) {
    case MEMBER_ROLES.ADMIN:
      return TEAM_ADMIN_PERMISSIONS
    case MEMBER_ROLES.VIEWER:
      return TEAM_VIEWER_PERMISSIONS
    case MEMBER_ROLES.MEMBER:
    default:
      return BUSINESS_TEAM_MEMBER_PERMISSIONS
  }
}

export function usePermissions() {
  const { user } = useSession()

  const permissions =
    user?.role === 'BUSINESS_TEAM_MEMBER'
      ? getTeamMemberPermissions((user as any).memberRole)
      : getPermissionsForRole(user?.role)

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
