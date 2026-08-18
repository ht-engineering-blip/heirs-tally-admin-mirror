import { Elysia } from 'elysia'

const API_BASE_URL = process.env.API_BASE_URL || 'https://e-invoicing-middleware.vercel.app'

const adminRoutes = new Elysia({ prefix: '/admin' })
  .all('/*', async ({ request, path }) => {
    try {
      // Extract the path after /api/v1/admin
      const apiPath = path.replace('/api/v1/admin', '')
      const url = new URL(request.url)
      const searchParams = url.searchParams.toString()
      const targetUrl = `${API_BASE_URL}${apiPath}${searchParams ? `?${searchParams}` : ''}`
      // Get request body if present
      let body: string | undefined
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        body = await request.text()
      }
      
      // Forward the request to the admin API
      const response = await fetch(targetUrl, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          // Forward authorization if present
          ...(process.env.ADMIN_API_KEY && {
            'x-admin-key': process.env.ADMIN_API_KEY!,
          }),
        },
        body,
      })

      // Get the response text first to handle both JSON and non-JSON responses
      const responseText = await response.text()
      
      // Try to parse as JSON, but if it fails the upstream returned something
      // non-JSON (e.g. an HTML gateway error page) — don't forward that raw
      // body to the client, it can be huge and unreadable in an Alert/toast.
      let data: any
      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        console.error('Non-JSON response from upstream:', responseText.slice(0, 500))
        data = { error: 'The server is currently unreachable. Please try again later.' }
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
      console.error('Elysia proxy error:', error)
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

export default adminRoutes