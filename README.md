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

## Key Features

### Transaction Logs (`/dashboard/transactions`, `/admin/transactions`)
- Unified `GET /v1/workflow/invoices/` endpoint — single call for both outbound and inbound invoices
- Server-side filtering by type, status, and search (400ms debounce on the search input)
- Status filter options are tab-aware: outbound tab shows only outbound statuses, inbound tab shows only inbound statuses
- Global invoice counts (`outbound`, `inbound`, `total`) sourced from `meta.countsByType` on the unified endpoint — accurate regardless of active tab or page

### Webhook Settings (`/dashboard/settings/webhook`)
- **Configuration tab** — generate/regenerate webhook URL and secret, enable/disable webhook
- **Invoice Keys tab** — configure the dot-notation path used to extract the invoice ID from incoming ERP payloads (supports standard invoices and credit notes)
- **Event Routing tab** — map incoming webhook event types to processing workflow actions
- **Test & Map tab** — send manual test payloads or open a live SSE stream to capture real events as they arrive; includes a field mapper for wiring ERP payload fields to NRS UBL schema fields
- **History tab** — powered by `GET /v1/webhook/events/` with real server-side pagination (7,828+ events). Clicking a row lazily fetches the full event detail (payload, job errors, failure reason, metadata) via `GET /v1/webhook/events/:eventId`

### Tenant Onboarding (`/dashboard/onboarding`)
Three-step flow gated by `firsProvisioning.completed` on the tenant record:
1. FIRS OAuth — authenticate with FIRS credentials
2. NRS Credentials — upload PEM certificate and public key (mock mode available in dev)
3. Webhook Generation — generate the inbound webhook URL

### Shared `DataTable` Component (`src/components/shared/DataTable.tsx`)
Supports two modes:
- **Uncontrolled** — client-side pagination and search; no `onPageChange` prop needed
- **Controlled** — server-side pagination; provide `currentPage`, `totalItems`, `pageSize`, `onPageChange`, and optionally `onSearch` to delegate search to the parent

When `onSearch` is wired the table passes data through unfiltered (search is handled server-side). When it is not wired the table filters the current page's data in memory.
