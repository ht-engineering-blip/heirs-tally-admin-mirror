import { Elysia } from 'elysia'
import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL || 'https://e-invoicing-middleware.vercel.app'

const tenantRoutes = new Elysia({ prefix: '/tenants' })
  .all('/*', async ({ request, path }) => {
    try {
      // Extract the path after /api/v1/tenants
      const apiPath = path.replace('/api/v1/tenants', '')

      const url = new URL(request.url)
      const searchParams = url.searchParams.toString()

      // Build the target URL to the tenant API
      const targetUrl = `${API_BASE_URL}${apiPath}${searchParams ? `?${searchParams}` : ''}`

      // Get Bearer token from available sources
      let bearerToken: string | undefined

      // 1. Explicit Authorization header (e.g. from server-side callers)
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        bearerToken = authHeader.slice(7)
      }

      // 2. access_token cookie — set as a plain cookie during tenant login
      if (!bearerToken) {
        const cookieHeader = request.headers.get('Cookie') || ''
        const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/)
        if (match) {
          bearerToken = match[1]
        }
      }

      // 3. NextAuth session token 
      if (!bearerToken) {
        try {
          const nextRequest = new NextRequest(request.url, {
            method: request.method,
            headers: new Headers(request.headers),
          })

          const cookieHeader = request.headers.get('Cookie') || ''
          const isSecure = /__Secure-authjs\.session-token/.test(cookieHeader)
          const cookieName = isSecure
            ? '__Secure-authjs.session-token'
            : 'authjs.session-token'

          const token = await getToken({
            req: nextRequest,
            secret: process.env.NEXTAUTH_SECRET || 'next-auth-secret-key',
            cookieName,
            salt: cookieName,
          })

          if (token?.token) {
            bearerToken = token.token as string
          }
        } catch (error) {
          console.warn('Failed to get token from NextAuth session:', error)
        }
      }

      // Get request body if present
      let body: string | undefined
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        body = await request.text()
      }

      // Forward the request to the tenant API
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          ...(bearerToken && { Authorization: `Bearer ${bearerToken}` }),
        },
        body,
      })

      const responseText = await response.text()

      // console.log("Proxy Resp: "+ responseText)
      let data: any
      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        data = { error: responseText || 'Unknown error' }
      }

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      console.error('Elysia tenant proxy error:', error)
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

export default tenantRoutes
