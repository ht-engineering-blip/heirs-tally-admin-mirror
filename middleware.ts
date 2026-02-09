import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getDashboardRoute, isRouteAccessible, getLoginRoute } from '@/lib/auth/routes'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files, API routes, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)
  ) {
    return NextResponse.next()
  }

  // Get the session token
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET || 'heirs-tally-super-admin-secret-key-change-in-production'
  })

  const userRole = token?.role as 'SUPER_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_TEAM_MEMBER' | undefined

  // Handle root path - redirect to appropriate dashboard
  if (pathname === '/') {
    if (token && userRole) {
      const dashboardRoute = getDashboardRoute(userRole)
      return NextResponse.redirect(new URL(dashboardRoute, request.url))
    } else {
      return NextResponse.redirect(new URL('/auth/super-admin/login', request.url))
    }
  }

  // Allow access to auth routes without authentication
  if (pathname.startsWith('/auth')) {
    // If already authenticated, redirect to appropriate dashboard
    if (token && userRole) {
      const dashboardRoute = getDashboardRoute(userRole)
      return NextResponse.redirect(new URL(dashboardRoute, request.url))
    }
    return NextResponse.next()
  }

  // Check if route requires authentication
  const protectedRoutes = ['/admin', '/dashboard', '/tenants', '/users', '/transactions']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    // If not authenticated, redirect to login
    if (!token || !userRole) {
      const loginRoute = getLoginRoute(userRole)
      return NextResponse.redirect(new URL(loginRoute, request.url))
    }

    // Check if user has access to this route
    if (!isRouteAccessible(pathname, userRole)) {
      // Redirect to their dashboard if they don't have access
      const dashboardRoute = getDashboardRoute(userRole)
      return NextResponse.redirect(new URL(dashboardRoute, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
