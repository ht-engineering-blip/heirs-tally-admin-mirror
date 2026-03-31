# Heirs Tally Admin Dashboard

A management and administration platform for the Heirs Tally e-invoicing system. Provides centralized control for Super Admins managing all tenants and system operations, and Business Admins managing their own tenant's invoicing, team, and integrations.

---

## Features

**Super Admin**
- Tenant lifecycle management (create, onboard, suspend, delete)
- System health monitoring and uptime metrics
- Global transaction logs across all tenants
- ERP synchronization configuration per tenant
- API key and webhook management
- NRS (National Revenue Service) dictionary management
- API testing sandbox

**Business Admin / Team**
- Dashboard with KPIs: invoice volume, revenue, ERP distribution
- Transaction history with full invoice data and status timeline
- ERP sync setup and monitoring
- Webhook configuration and event routing
- Team member invitations and role management
- API key generation and management
- Account onboarding flow

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.8 |
| Styling | Tailwind CSS 3.4 |
| Auth | NextAuth v5 (JWT, Credentials provider) |
| API Proxy | Elysia 1.4 + Eden Treaty |
| State / Data Fetching | React Query 5 |
| Forms | React Hook Form 7 + Zod |
| UI Primitives | Radix UI |
| Charts | Recharts 2 |
| Code Editor | Monaco Editor |
| Testing | Vitest |

---

## Roles & Access

| Role | Access |
|---|---|
| `SUPER_ADMIN` | Full system access via `/admin` routes |
| `BUSINESS_ADMIN` | Full tenant access via `/dashboard` routes |
| `BUSINESS_TEAM_MEMBER` | Read-only/limited access via `/dashboard` routes |

---

## Project Structure

```
heirs-tally-admin/
├── app/
│   ├── admin/              # Super admin pages
│   ├── dashboard/          # Business dashboard pages
│   ├── auth/               # Login, register, password flows
│   └── api/                # API proxy routes (Elysia) + NextAuth
├── src/
│   ├── components/
│   │   ├── dashboard/      # KPI cards, charts, tables
│   │   ├── layout/         # Header, sidebar, wrappers
│   │   ├── shared/         # DataTable, StatusBadge, loaders
│   │   ├── onboarding/     # Tenant onboarding steps
│   │   └── ui/             # Radix UI primitives
│   ├── hooks/              # use-session, use-permissions, use-mobile, etc.
│   ├── lib/
│   │   ├── api/            # Eden Treaty client + React Query hooks
│   │   ├── auth/           # NextAuth config and helpers
│   │   ├── mockData/       # Mock data for dev/testing
│   │   └── schema/         # Zod schemas
│   ├── types/              # Shared TypeScript types
│   └── views/              # Page-level view components
└── ...config files
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or compatible package manager

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file at the project root:

```env
# Backend middleware base URL
API_BASE_URL=https://e-invoicing-middleware.vercel.app

# Admin API key sent to backend for super admin requests
ADMIN_API_KEY=dev-admin-key

# Public environment flag (used for dev-only UI like mock credential toggles)
APP_ENV=development

# NextAuth secret (auto-generated if omitted in development)
NEXTAUTH_SECRET=your-secret-here
```

### Running Locally

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Production build
npm start         # Start production server
npm run lint      # Lint
npm run test      # Run unit tests (Vitest)
npm run test:watch
```

---

## Key Routes

### Super Admin (`/admin`)

| Route | Description |
|---|---|
| `/admin` | Overview dashboard |
| `/admin/tenants/all` | All tenants list |
| `/admin/tenants/[tenantId]` | Tenant detail |
| `/admin/tenants/api-keys` | API key management |
| `/admin/tenants/erp-sync-config` | ERP sync config |
| `/admin/tenants/transactions` | Transaction logs |
| `/admin/tenants/webhook-config` | Webhook config |
| `/admin/system/settings` | System settings |
| `/admin/system/health` | Health monitoring |
| `/admin/system/nrs-dictionary` | NRS dictionary |
| `/admin/sandbox` | API testing sandbox |

### Business Dashboard (`/dashboard`)

| Route | Description |
|---|---|
| `/dashboard` | KPI + charts overview |
| `/dashboard/onboarding` | Onboarding flow |
| `/dashboard/transactions` | Transaction history |
| `/dashboard/transactions/[irn]` | Transaction detail |
| `/dashboard/erp-sync` | ERP sync management |
| `/dashboard/settings/api-keys` | API keys |
| `/dashboard/settings/webhook` | Webhook settings |
| `/dashboard/team` | Team management |
| `/dashboard/sandbox` | API sandbox |

### Auth (`/auth`)

| Route | Description |
|---|---|
| `/auth/login` | Business user login |
| `/auth/super-admin/login` | Super admin login |
| `/auth/register` | Registration |
| `/auth/activate` | Account activation |
| `/auth/accept-invite` | Invite acceptance |
| `/auth/forgot-password` | Password reset request |
| `/auth/reset-password` | Password reset |
| `/auth/set-password` | Set new password |

---

## Architecture Notes

- **API Proxy**: All requests from the browser go through an Elysia-based proxy at `/api/[...]`. The proxy attaches auth tokens (from cookies or NextAuth JWT) before forwarding to the backend middleware.
- **RBAC**: Route protection and UI gating are handled via `use-permissions` hook and NextAuth session role checks.
- **Mock-first development**: A full mock API layer in `src/lib/mockData/` allows development and testing independent of the backend.
- **Dev-only features**: Some UI elements (e.g. NRS OAuth mock credentials toggle) are gated by `APP_ENV=development` or `NODE_ENV`.
