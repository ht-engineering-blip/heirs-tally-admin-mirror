# Admin API Proxy with Eden Treaty

This directory contains the client-side API setup using Eden Treaty to interact with the admin API proxy.

## Setup

The proxy is configured at `/api/admin/[[...slugs]]` and forwards all requests to the middleware API for routes tagged "Admin - **".

## Environment Variables

Add to your `.env.local`:

```env
API_BASE_URL=https://e-invoicing-middleware.vercel.app
NEXT_PUBLIC_API_URL=/api/admin
```

## Usage

### Using the Eden Treaty Client

```tsx
'use client'

import { api } from '@/lib/api/client'

// Make a GET request
const response = await api.index.get({ $query: { path: '/tenants' } })
const data = response.data

// Make a POST request
const createResponse = await api.index.post(
  { name: 'New Tenant', email: 'tenant@example.com' },
  { $query: { path: '/tenants' } }
)
```

### Using React Query Hooks

```tsx
'use client'

import { useAdminQuery, useAdminMutation } from '@/lib/api/hooks'

// Query hook
function TenantsList() {
  const { data, isLoading, error } = useAdminQuery('/tenants')
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return <div>{/* Render tenants */}</div>
}

// Mutation hook
function CreateTenant() {
  const mutation = useAdminMutation('/tenants', {
    onSuccess: (data) => {
      console.log('Tenant created:', data)
    },
  })
  
  const handleSubmit = () => {
    mutation.mutate({ name: 'New Tenant', email: 'tenant@example.com' })
  }
  
  return <button onClick={handleSubmit}>Create Tenant</button>
}
```

### Using the Generic API Hook

```tsx
'use client'

import { useAdminApi } from '@/lib/api/hooks'

function MyComponent() {
  const api = useAdminApi()
  
  const fetchData = async () => {
    const data = await api.get('/tenants')
    console.log(data)
  }
  
  const createData = async () => {
    const data = await api.post('/tenants', { name: 'New Tenant' })
    console.log(data)
  }
  
  return (
    <div>
      <button onClick={fetchData}>Fetch</button>
      <button onClick={createData}>Create</button>
    </div>
  )
}
```

## Authentication

All requests are automatically authenticated using the NextAuth session. The proxy:
- Checks for a valid session
- Verifies the user has admin role (SUPER_ADMIN or BUSINESS_ADMIN)
- Forwards the request to the middleware API
- Returns the response to the client

## Error Handling

The API client handles errors automatically. You can catch errors in your components:

```tsx
try {
  const data = await api.get('/tenants')
} catch (error) {
  console.error('API Error:', error)
}
```

## Type Safety

The Eden Treaty client provides type safety based on your API structure. Update the types in `client.ts` as needed when the API spec changes.
