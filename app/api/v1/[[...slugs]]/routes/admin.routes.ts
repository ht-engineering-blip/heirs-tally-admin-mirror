import { Elysia } from 'elysia'

const API_BASE_URL = process.env.API_BASE_URL || 'https://e-invoicing-middleware.vercel.app'

const adminRoutes = new Elysia({ prefix: '/admin' })
  .all('/*', async ({ request, path }) => {
    try {
      // Extract the path after /api/v1/admin
      const apiPath = path.replace('/api/v1/admin', '')
      const url = new URL(request.url)
      const searchParams = url.searchParams.toString()
      
      // Build the target URL to the admin API
      const targetUrl = `${API_BASE_URL}${apiPath}${searchParams ? `?${searchParams}` : ''}`
      
      console.log({targetUrl})
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

      const data = await response.json()
      
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (error) {
      console.error('Elysia proxy error:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
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