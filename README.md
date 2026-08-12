# Heirs E-Invoicing Admin

A multi-tenant B2B e-invoicing platform that helps businesses generate, validate, and submit invoices electronically in compliance with NRS/FIRS requirements in Nigeria.

## Overview

The platform bridges a business's internal ERP system (Tally, SAP, NetSuite, etc.) and the government's tax authority infrastructure. It intercepts invoice events, signs and validates payloads using NRS-issued credentials, submits them to the NRS, and returns an Invoice Reference Number (IRN).

## Portals

- **Super Admin** (`/admin`) — platform management: tenant onboarding, ERP configuration, webhook oversight, transaction auditing
- **Tenant Dashboard** (`/dashboard`) — self-service: webhook setup, ERP sync, invoice ID key configuration, API keys, team management

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Auth:** NextAuth v5 (credentials provider, JWT session strategy)
- **API Client:** Eden Treaty (`@elysiajs/eden`) with typed server types
- **UI:** Radix UI + Tailwind CSS + shadcn/ui components
- **State:** TanStack Query v5
- **Forms:** React Hook Form + Zod

## Getting Started

```bash
yarn install
yarn dev
```

Copy `.env.example` to `.env` and fill in the required values before running.

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL for the API proxy (defaults to `window.location.origin/api/v1`) |
| `API_BASE_URL` | Backend middleware URL (defaults to `https://e-invoicing-middleware.vercel.app`) |
| `ADMIN_API_KEY` | Secret key injected as `x-admin-key` on all admin proxy requests |
| `NEXTAUTH_SECRET` | Secret used to sign/encrypt NextAuth session tokens |
| `NEXTAUTH_URL` | Full URL of this deployment (required in production) |

## Architecture

API requests from the browser go through a local Next.js proxy at `/api/v1/[[...slugs]]`, which routes to either the admin or tenant backend:

- `/api/v1/admin/*` → injects `x-admin-key` header → forwards to backend
- `/api/v1/tenants/*` → injects `Authorization: Bearer` from cookie → forwards to backend

Bearer tokens (backend JWTs) are stored in a `js-cookie` cookie (`access_token`, 7-day expiry). NextAuth manages identity/role in a separate encrypted session cookie.
