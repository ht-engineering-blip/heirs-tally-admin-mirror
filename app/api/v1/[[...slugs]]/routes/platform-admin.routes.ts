import { Elysia } from 'elysia'

const API_BASE_URL = process.env.API_BASE_URL || 'https://e-invoicing-middleware.vercel.app'

// Forwards a platform admin's own bearer token (login/me/refresh only —
// monitoring data itself is read through the existing /api/v1/admin proxy,
// whose static x-admin-key already bypasses the module-permission check).
const platformAdminRoutes = new Elysia({ prefix: '/platform-admin' })
  .all('/*', async ({ request, path }) => {
    try {
      // Extract the path after /api/v1/platform-admin
      const apiPath = path.replace('/api/v1/platform-admin', '')

      const url = new URL(request.url)
      const searchParams = url.searchParams.toString()

      const targetUrl = `${API_BASE_URL}${apiPath}${searchParams ? `?${searchParams}` : ''}`

      // Get Bearer token from available sources
      let bearerToken: string | undefined

      // 1. Explicit Authorization header (e.g. from server-side callers)
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        bearerToken = authHeader.slice(7)
      }

      // 2. platform_admin_token cookie — set as a plain cookie during platform admin login
      if (!bearerToken) {
        const cookieHeader = request.headers.get('Cookie') || ''
        const match = cookieHeader.match(/(?:^|;\s*)platform_admin_token=([^;]+)/)
        if (match) {
          bearerToken = match[1]
        }
      }

      // Get request body if present
      let body: string | undefined
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        body = await request.text()
      }

      // Forward the request to the platform admin API
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          ...(bearerToken && { Authorization: `Bearer ${bearerToken}` }),
        },
        body,
      })

      const responseText = await response.text()

      let data: any
      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        console.error('Non-JSON response from upstream:', responseText.slice(0, 500))
        data = { error: 'The server is currently unreachable. Please try again later.' }
      }

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Elysia platform-admin proxy error:', error)
      return new Response(
        JSON.stringify({
          error: 'Proxy error',
          message: error instanceof Error ? error.message : 'Unknown error',
          statusCode: 500,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  })

export default platformAdminRoutes
