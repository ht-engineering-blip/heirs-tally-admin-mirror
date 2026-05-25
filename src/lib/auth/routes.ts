/**
 * Role-based route configuration
 * Defines dashboard routes for each user role
 */

export type UserRole = 'SUPER_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_TEAM_MEMBER'

/**
 * Get the dashboard route for a given user role
 */
export function getDashboardRoute(role: UserRole | undefined): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/admin'
    case 'BUSINESS_ADMIN':
      return '/dashboard'
    case 'BUSINESS_TEAM_MEMBER':
      return '/dashboard'
    default:
      return '/auth/login'
  }
}

/**
 * Check if a route is accessible by a given role
 */
export function isRouteAccessible(route: string, role: UserRole | undefined): boolean {
  if (!role) return false

  // Public routes
  const publicRoutes = ['/auth', '/api']
  if (publicRoutes.some(publicRoute => route.startsWith(publicRoute))) {
    return true
  }

  // Role-specific routes
  switch (role) {
    case 'SUPER_ADMIN':
      // Super admin can access everything
      return true
    case 'BUSINESS_ADMIN':
      // Business admin can access dashboard and tenant-specific routes
      return route.startsWith('/dashboard') || 
             route.startsWith('/tenants') || 
             route.startsWith('/users') ||
             route.startsWith('/transactions')
    case 'BUSINESS_TEAM_MEMBER':
      // Team members can only access dashboard and limited tenant routes
      return route.startsWith('/dashboard') || 
             route.startsWith('/tenants/transactions')
    default:
      return false
  }
}

/**
 * Get the login route for a given role
 */
export function getLoginRoute(role: UserRole | undefined): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/auth/super-admin/login'
    case 'BUSINESS_ADMIN':
    case 'BUSINESS_TEAM_MEMBER':
      return '/auth/login'
    default:
      return '/auth/super-admin/login'
  }
}
