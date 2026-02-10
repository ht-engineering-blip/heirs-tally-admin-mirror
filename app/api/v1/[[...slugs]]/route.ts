import { Elysia } from 'elysia'
import adminRoutes from './routes/admin.routes'
import tenantRoutes from './routes/tenant.routes'
import { openapi } from '@elysiajs/openapi'
const app = new Elysia({ prefix: '/api/v1' })
.get('/', () => {
  return {
    message: 'Heirs Tally API Proxy',
    description: 'API Proxy for Heirs Tally',
    version: '1.0.1',
  }
})
.use
(
  openapi
    ({
      documentation: {
        info: {
          title: 'Heirs Tally API Proxy',
          description: 'API Proxy for Heirs Tally',
          version: '1.0.1',
        },
       
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            },
            adminKey: {
              type: 'apiKey',
              description: "Admin Key",
              name: "x-admin-key",
              in: "header"
            },
            apiKey: {
              type: 'apiKey',
              description: "API Key",
              name: "x-api-key",
              in: "header"
            }
          }
        }
      },
      path: '/docs',
      scalar:{
        tagsSorter: 'alpha'
      }
    })
)
.use(tenantRoutes)
.use(adminRoutes);

export const GET = app.fetch 
export const POST = app.fetch 
export const PUT = app.fetch 
export const DELETE = app.fetch 
export const PATCH = app.fetch  