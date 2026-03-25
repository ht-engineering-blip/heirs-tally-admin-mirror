import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { getDashboardRoute, isRouteAccessible, getLoginRoute } from '@/lib/auth/routes'

export default auth((request) => {
  const { pathname } = request.nextUrl

  const session = request.auth
  const userRole = session?.user?.role as 'SUPER_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_TEAM_MEMBER' | undefined

  // Handle root path - redirect to appropriate dashboard
  if (pathname === '/') {
    if (session && userRole) {
      const dashboardRoute = getDashboardRoute(userRole)
      return NextResponse.redirect(new URL(dashboardRoute, request.url))
    } else {
      return NextResponse.redirect(new URL('/auth/super-admin/login', request.url))
    }
  }

  // Allow access to auth routes — do NOT redirect authenticated users away,
  // as this can cause a loop if the client-side session disagrees with middleware
  if (pathname.startsWith('/auth')) {
    return NextResponse.next()
  }

  // Check if route requires authentication
  const protectedRoutes = ['/admin', '/dashboard', '/tenants', '/users', '/transactions']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    if (!session || !userRole) {
      const loginRoute = getLoginRoute(userRole)
      return NextResponse.redirect(new URL(loginRoute, request.url))
    }

    if (!isRouteAccessible(pathname, userRole)) {
      const dashboardRoute = getDashboardRoute(userRole)
      return NextResponse.redirect(new URL(dashboardRoute, request.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes — including /api/auth which must not be wrapped)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
