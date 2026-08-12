# Heirs E-Invoicing Admin — Super Admin User Journey

## What is Heirs E-Invoicing Admin?

**Heirs E-Invoicing Admin** is a multi-tenant B2B e-invoicing platform built to help businesses generate, validate, and submit invoices electronically in compliance with the National Revenue Service (NRS) and the Federal Inland Revenue Service (FIRS) requirements in Nigeria.

The platform acts as a bridge between a business's internal accounting or ERP system (such as Tally, SAP, or NetSuite) and the government's tax authority infrastructure. When a business raises an invoice in their ERP, Heirs E-Invoicing Admin intercepts that event, signs and validates the invoice payload using NRS-issued credentials, submits it to the NRS, and returns a unique **Invoice Reference Number (IRN)** — the government-issued proof that the invoice is compliant.

Key capabilities of the platform include:

- **ERP Integration** — connects to a business's existing accounting software to capture invoice events automatically
- **NRS/FIRS Compliance** — handles OAuth authentication, certificate-based signing, and submission to the NRS on behalf of the business
- **Webhook System** — notifies the business's systems in real time when invoice statuses change
- **Multi-Tenancy** — supports multiple business clients (tenants) on a single platform instance, each with isolated data and configuration
- **Role-Based Access** — three distinct roles (Super Admin, Business Admin, Business Team Member) with granular permission controls
- **Sandbox Environment** — allows businesses to test their integration end-to-end before going live

The platform is managed by a **Super Admin** who oversees the entire system, and accessed by **Tenants** (businesses) who use it to manage their own e-invoicing operations.

---

## About This Document

This document covers the full user journey for the **Super Admin** role, starting from authentication. The Super Admin is responsible for configuring the platform, onboarding and managing tenants, and maintaining system health.

For the tenant-side journey, see `tenant-user-journey.md`.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Dashboard Overview](#2-dashboard-overview)
3. [System Configuration](#3-system-configuration)
4. [Tenant Management](#4-tenant-management)
5. [ERP & Webhook Configuration](#5-erp--webhook-configuration)
6. [Transaction Auditing](#6-transaction-auditing)
7. [Sandbox / Testing](#7-sandbox--testing)
8. [Session End](#8-session-end)

---

### 1. Authentication

**Route:** `/auth/super-admin/login`

- Admin navigates to the super admin login page.
- Enters the platform-issued **login key**.
- System validates the key against the platform credential store.
- On failure → error message displayed; admin remains on the login page.
- On success → session created with `SUPER_ADMIN` role; redirected to `/admin`.

---

### 2. Dashboard Overview

**Route:** `/admin`

Upon landing, the admin gets a full platform snapshot:

**KPI Cards**
- Total number of tenants on the platform
- Number of currently active tenants
- ERP distribution — breakdown of which ERP systems tenants are using

**Tenant Status Visualization**
- Count and proportion of tenants by status: Active, Pending, Suspended, Inactive

**System Health Overview**
- High-level indicators of platform service health

This gives the admin situational awareness before taking any action.

---

### 3. System Configuration

**Route:** `/admin/system/*`

Done immediately after reviewing the dashboard — establishes the platform foundation before onboarding any tenants.

**NRS Dictionary** — `/admin/system/nrs-dictionary`
- View, add, and update National Revenue Service (NRS) field mappings
- These mappings are referenced during invoice validation and e-invoicing submission

**ERP Support** — `/admin/system/erp-support`
- Configure which ERP systems the platform supports (e.g. Tally, SAP, NetSuite, Oracle)
- Enable or disable support for specific ERP versions
- Define sync behaviour per ERP type

**System Settings** — `/admin/system/settings`
- Platform-wide configuration values
- Environment flags, default thresholds, rate limits

**System Health** — `/admin/system/health`
- Real-time service status for platform components
- Identify degraded or failing services before they impact tenants

---

### 4. Tenant Management

**Route:** `/admin/tenants/*`

**Viewing All Tenants** — `/admin/tenants/all`
- Paginated list of all business tenants
- Search by name or email
- Filter by status: Active, Pending, Suspended, Inactive
- Filter by ERP type
- Click any row to navigate directly to that tenant's detail page

**Adding a New Tenant**
- Admin fills in tenant details: business name, email, assigned ERP
- System creates the tenant account in `pending` state
- Platform automatically sends an activation email to the tenant's registered email address containing a unique setup link
- Tenant record appears in the list with `pending` status until setup is complete

**Viewing Tenant Details** — `/admin/tenants/[tenantId]`

Three tabs:

*Overview* — Full profile of the tenant: business name, TIN, contact details, ERP system, status, and creation date. FIRS credentials (certificate and service ID) can be viewed or updated here.

*Configuration* — Two cards:
- **Webhook** — view the tenant's current webhook URL and secret; generate or regenerate a webhook on behalf of the tenant
- **Invoice ID Keys** — configure the dot-notation field paths used to extract invoice identifiers from the ERP payload, per document type:
  - *Standard Invoices* — Invoice ID Key
  - *Credit Notes* — Invoice ID Key + Reference ID Key (path to the field referencing the original invoice)
  - *Debit Notes* — Invoice ID Key + Reference ID Key

*Onboarding* — Current onboarding status and step-by-step progress; admin can update status and add notes or rejection reasons

**Tenant Lifecycle Actions**
- **Activate** — move a pending tenant to active status
- **Suspend** — temporarily restrict a tenant's access
- **Deactivate** — disable the tenant without deletion
- **Delete** — permanently remove the tenant (destructive; requires confirmation)

---

### 5. ERP & Webhook Configuration

**ERP Sync Configuration** — `/admin/tenants/erp-sync-config`
- View and manage ERP integration settings across all tenants
- Override or correct ERP sync parameters for specific tenants
- Monitor sync health per tenant-ERP pair

**Webhook Configuration** — `/admin/tenants/webhook-config`
- Set or override webhook endpoint URLs globally or per tenant
- Review active webhook subscriptions
- Inspect webhook delivery logs and failure rates
- Invoice ID Key configuration (per document type) is managed from the individual tenant's Configuration tab, not from this bulk view

**API Keys Management** — `/admin/tenants/api-keys`
- View all API keys across all tenants
- See key usage statistics (call count, last used timestamp)
- Revoke keys that are compromised or expired

---

### 6. Transaction Auditing

**Route:** `/admin/tenants/transactions`

- Full cross-tenant transaction log
- Each record shows: IRN, tenant, ERP source, submission status, timestamp
- Filter by:
  - Tenant name
  - Transaction status (submitted, failed, pending, rejected)
  - Date range
  - IRN
- Click into any transaction for full detail view
- Use for compliance auditing, dispute resolution, and debugging

---

### 7. Sandbox / Testing

**Route:** `/admin/sandbox`

- Make test API calls against a sandboxed environment
- Validate endpoint behaviour without affecting production data
- Useful for testing new ERP integrations or NRS configuration changes before rolling out to tenants

---

### 8. Session End

- Admin clicks the avatar/logout control in the header
- Confirmation dialog appears: "Are you sure you want to log out?"
- On confirm → session token invalidated; redirected to `/auth/super-admin/login`
