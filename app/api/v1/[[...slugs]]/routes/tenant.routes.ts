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
      
      // Get Bearer token - check if it's stored in the JWT token or in the Authorization header
      let bearerToken: string | undefined
     
      
      // First, check if Authorization header is already present in the request
      const authHeader = request.headers.get('Authorization') 
      if (authHeader && authHeader.startsWith('Bearer ')) {
        bearerToken = authHeader.replace('Bearer ', '')
        console.log({bearerToken})
      } else {
        // Try to get token from NextAuth JWT
        try {
          // Create a NextRequest from the Elysia request for getToken
          const nextRequest = new NextRequest(request.url, {
            method: request.method,
            headers: new Headers(request.headers),
          })
          
          const token = await getToken({
            req: nextRequest,
            secret: process.env.NEXTAUTH_SECRET || 'heirs-tally-super-admin-secret-key-change-in-production',
          })
          console.log({token})
          // If token is stored in the JWT (from set-password or accept-invite flows)
          if (token?.token) {
            bearerToken = token.token as string
          }
        } catch (error) {
          // If we can't get the token from NextAuth, continue without it
          console.warn('Failed to get token from NextAuth:', error)
        }
      }

      // Get request body if present
      let body: string | undefined
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        body = await request.text()
      }
      
      console.log({
        'Content-Type': 'application/json',
        // Use Bearer token if available
        ...(bearerToken && {
          'Authorization': `Bearer ${bearerToken}`,
        })})
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