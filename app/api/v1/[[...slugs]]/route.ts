import { Elysia } from 'elysia'
import adminRoutes from './routes/admin.routes'

const app = new Elysia({ prefix: '/api/v1' })
.all('/*', async ({ request, path }) => {
  console.log(request) 
})
.use(adminRoutes);

export const GET = app.fetch 
export const POST = app.fetch 
export const PUT = app.fetch 
export const DELETE = app.fetch 
export const PATCH = app.fetch  