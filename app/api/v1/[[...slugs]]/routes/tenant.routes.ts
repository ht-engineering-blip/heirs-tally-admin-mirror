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

      // 1. Check Authorization header
      const authHeader = request.headers.get('Authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        bearerToken = authHeader.replace('Bearer ', '')
      }

      // 2. Check access_token cookie (set during login)
      if (!bearerToken) {
        const cookieHeader = request.headers.get('Cookie') || ''
        const accessTokenMatch = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/)
        if (accessTokenMatch) {
          bearerToken = accessTokenMatch[1]
        }
      }

      // 3. Fallback: try NextAuth JWT
      if (!bearerToken) {
        try {
          const nextRequest = new NextRequest(request.url, {
            method: request.method,
            headers: new Headers(request.headers),
          })

          const token = await getToken({
            req: nextRequest,
            secret: process.env.NEXTAUTH_SECRET || 'heirs-tally-super-admin-secret-key-change-in-production',
          })
          if (token?.token) {
            bearerToken = token.token as string
          }
        } catch (error) {
          console.warn('Failed to get token from NextAuth:', error)
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
          // Use Bearer token if available
          ...(bearerToken && {
            'Authorization': `Bearer ${bearerToken}`,
          }),
        },
        body,
      })

      // Get the response text first to handle both JSON and non-JSON responses
      const responseText = await response.text()
      
      // Try to parse as JSON, but if it fails, return the raw text
      let data: any
      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        // If parsing fails, return the raw text as the error message
        data = { error: responseText || 'Unknown error' }
      }
      
      // Return the API response as-is, preserving status code and error structure
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      // Only catch actual network/parsing errors, not HTTP error responses
      console.error('Elysia tenant proxy error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Proxy error', 
          message: error instanceof Error ? error.message : 'Unknown error',
          statusCode: 500
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }
  })

export default tenantRoutes