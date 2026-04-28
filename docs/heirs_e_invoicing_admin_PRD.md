# Product Requirements Document (PRD)
## Heirs E-Invoicing Admin — E-Invoicing Management Platform

**Document Version:** 1.0
**Date:** February 6, 2026
**Prepared by:** E-Invoicing Development Team
**Organization:** Heirs Technologies
**Related Document:** BRD v1.0

---

## 1. Product Overview

### 1.1 Product Summary

Heirs E-Invoicing Admin is a web-based SaaS platform that enables Nigerian businesses to issue, receive, and manage electronic invoices in compliance with the Federal Inland Revenue Service (FIRS) National Revenue Service (NRS) mandate. It serves as the central hub connecting a business's ERP system to the NRS processing pipeline, handling the full invoice lifecycle automatically while giving users real-time visibility and control.

### 1.2 Problem Statement

Nigerian businesses are required by law to issue e-invoices through the FIRS/NRS platform. However, most businesses operate ERPs (Tally, SAP, Oracle, etc.) that cannot directly integrate with NRS. This creates a compliance gap where businesses either:
- Manually re-enter invoices into the NRS portal (slow, error-prone), or
- Remain non-compliant (regulatory risk)

Additionally, businesses need to track inbound invoices from suppliers, monitor payment statuses, and sync all this activity back to their own ERP — none of which the NRS portal natively provides.

### 1.3 Solution

Heirs E-Invoicing Admin bridges this gap by:
1. Accepting invoice data from any ERP via API
2. Automatically processing invoices through the NRS pipeline (transform, validate, sign, transmit, deliver)
3. Providing a management dashboard for visibility, error recovery, and payment tracking
4. Syncing processed results back to the tenant's ERP

### 1.4 Target Users

| User Type | Description |
|-----------|-------------|
| Business Admin (Technical Specialist) | Technical lead at a Nigerian business responsible for integrating the platform with their ERP, configuring webhooks, managing API keys, and completing NRS onboarding |
| Team Member (Finance Manager) | Finance lead responsible for monitoring invoice compliance, updating payment statuses, and reviewing transmission summaries |
| Team Member (Accounts Receivable Clerk) | Operational staff who track individual invoice delivery statuses and access audit trail logs |
| Super Admin | Heirs Technologies internal staff managing the platform and onboarding clients |

---

## 2. Goals and Non-Goals

### Goals
- Automate NRS-compliant invoice submission with minimal manual effort
- Give businesses real-time visibility into every invoice's processing state
- Recover gracefully from errors without requiring full re-submission
- Support flexible ERP integration without mandating a specific ERP system
- Enable Heirs Technologies to onboard and manage clients at scale

### Non-Goals
- Building ERP plugins or connectors (tenants configure their own endpoints)
- Processing payments or acting as a payment gateway
- Replacing the NRS portal — Heirs E-Invoicing Admin integrates with it, not replaces it
- Mobile app (web-only)
- Multi-country tax compliance (Nigeria/FIRS only)

---

## 3. User Personas

> **Note:** This is primarily a technical platform. The majority of configuration — webhooks, ERP sync, API keys, NRS credentials — is handled by a technical specialist. Non-technical use is limited to the dashboard overview and payment status updates.

### Persona 1 — Business Admin (Technical Specialist)
- **Role:** IT or integration lead responsible for connecting the organisation's ERP to the NRS pipeline
- **Goal:** Complete NRS onboarding, configure webhook event routing, set up ERP sync endpoints, manage API keys, and ensure the middleware is correctly wired to the organisation's accounting system
- **Pain Points:**
  - Configuring middleware to sync processed invoices back to their ERP or accounting system without a standardised integration layer
  - Diagnosing transmission failures without clear error context from the NRS pipeline
  - Managing API credentials and webhook secrets securely across environments
- **Needs:** Full access to onboarding, ERP sync configuration, webhook setup, API key management, and error diagnostics

### Persona 2 — Team Member (Finance Manager)
- **Role:** Finance lead overseeing invoice compliance and payment reconciliation
- **Goal:** Monitor the overall status of invoice transmissions, update payment statuses to reflect receipts, and ensure NRS payment records are accurate
- **Pain Points:**
  - No visibility into which invoices have been successfully transmitted to NRS vs. failed
  - Updating invoice payment status for NRS requires navigating a system they did not set up
  - Accessing a reliable audit trail of transmitted invoices for financial reporting
- **Needs:** Dashboard overview, payment status update capability, transaction list with filtering

### Persona 3 — Team Member (Accounts Receivable Clerk)
- **Role:** Operational staff tracking individual invoice delivery and following up with customers
- **Goal:** Check the real-time transmission status of specific invoices and access audit trail logs for proof of delivery
- **Pain Points:**
  - No direct visibility into where an invoice is in the transmission pipeline (validated, signed, delivered, etc.)
  - Accessing the audit trail for a transmitted invoice requires going through a manager
  - Cannot confirm delivery status to customers without manual follow-up
- **Needs:** Read access to invoice list and detail, transmission status visibility, audit trail / history tab, QR code download

### Persona 4 — Super Admin
- **Role:** Heirs Technologies platform engineer / client success
- **Goal:** Onboard new clients quickly, monitor tenant health, and fix configuration issues
- **Pain Points:** No central view across all clients; manual ERP config per client
- **Needs:** Tenant management dashboard, ability to configure any tenant's settings, system health visibility

---

## 4. Feature Specifications

---

### 4.1 Authentication

#### 4.1.1 Tenant Login
**Description:** Email and password login for business users.

**User Story:** As a business user, I want to log in with my email and password so I can access my invoice dashboard.

**Acceptance Criteria:**
- Login form accepts email and password
- Incorrect credentials display an inline error message
- Successful login redirects Business Admins to `/dashboard` and Team Members to `/dashboard`
- Unauthenticated users attempting to access protected routes are redirected to `/auth/login`
- Session persists for 30 days; expired sessions redirect to login

#### 4.1.2 Super Admin Login
**Description:** Login-key-based authentication for platform administrators.

**User Story:** As a Super Admin, I want to log in with a secure key so I can access the admin panel.

**Acceptance Criteria:**
- Super admin login accepts a login key field (not email/password)
- Successful login redirects to `/admin`
- Invalid key displays an error
- Super admin sessions are isolated from tenant sessions

#### 4.1.3 Password Reset
**Description:** Allow users to reset forgotten passwords via email link.

**Acceptance Criteria:**
- Forgot password form accepts an email address
- System sends a reset link if the email is registered
- Reset link navigates to a set-password form
- New password must meet minimum strength requirements
- Used reset links are invalidated after use or expiry

#### 4.1.4 Team Member Invite
**Description:** Team members receive an email invite and activate their account by setting a password.

**Acceptance Criteria:**
- Invite email contains a unique activation link
- Activation form prompts for name and password
- On activation, user is logged in and redirected to dashboard
- Expired or already-used invite links show an error

---

### 4.2 Tenant Onboarding

**Description:** A guided 3-step flow that new tenants must complete before accessing the dashboard.

**User Story:** As a new Business Admin, I want to complete the onboarding steps so that my account is provisioned with NRS and ready to issue invoices.

#### Step 1 — NRS OAuth
**Acceptance Criteria:**
- Form accepts FIRS email and password
- On submission, system authenticates against the NRS/FIRS portal
- On success, retrieved business details (name, TIN, sector, ERP type) are displayed for confirmation
- On failure, an inline error is shown with the reason
- Development mode supports a mock credentials toggle

#### Step 2 — NRS Credentials
**Acceptance Criteria:**
- Form accepts SSL certificate file upload (PEM/CRT format)
- Form accepts public key file upload
- Both files are validated client-side for format before submission
- On success, step is marked complete and user proceeds to Step 3

#### Step 3 — Webhook Generation
**Acceptance Criteria:**
- System auto-generates a unique webhook URL and secret for the tenant on page load
- Both values are displayed with copy-to-clipboard buttons
- User confirms to complete the step
- On completion, onboarding is marked finished and user is redirected to `/dashboard`

#### Onboarding General Rules
- Users who have not completed onboarding are redirected to `/dashboard/onboarding` on login
- The stepper displays completed, active, and pending steps visually
- Users can navigate back to a completed step to review details but cannot skip ahead

---

### 4.3 Dashboard Overview

**Description:** Landing page after login showing high-level invoice KPIs and recent activity.

**User Story:** As a Business Admin, I want to see a summary of my invoice activity at a glance so I can quickly spot issues.

**Acceptance Criteria:**
- KPI cards display: Total Invoices, Outbound Invoices, Inbound Invoices, Account Status
- A recent outbound invoices table shows the 5 most recent invoices with IRN, customer, amount, date, and status
- Account details panel shows: business name, TIN, ERP system, contact email/phone
- Clicking a recent invoice navigates to its detail page
- If onboarding is incomplete, a banner prompts the user to complete it

---

### 4.4 Transaction Management

**Description:** Full invoice list view with filtering, search, detail drill-down, and actions.

#### 4.4.1 Invoice List
**User Story:** As a user, I want to view all my invoices in one place and filter them by type or status so I can find what I need quickly.

**Acceptance Criteria:**
- Tabs for All, Outbound, and Inbound invoices
- Summary status cards above the table: Total, Outbound, Inbound, Pending, Failed counts
- Table columns: IRN, Invoice Number, Customer/Supplier, Amount, Date, Invoice Status, Payment Status
- Filters: Invoice status dropdown, date range picker
- Search: Real-time search by IRN, invoice number, customer/supplier name
- Pagination with configurable page size
- Clicking a row opens the invoice detail modal or navigates to the detail page

#### 4.4.2 Invoice Detail — Overview Tab
**Acceptance Criteria:**
- Displays: IRN, invoice number, customer name, total amount, currency, issue date, ERP system, ERP invoice ID
- Displays invoice status badge and payment status badge
- Workflow progress bar showing: Transform → Validate → Sign → Transmit → Deliver (with step completion state)
- Validation errors listed with field name, error code, and message
- Last job error displayed (action, error message, timestamp) if applicable
- QR code displayed for DELIVERED invoices with a download button
- Resend button (full workflow restart) visible for FAILED invoices
- Retry from step dropdown visible for FAILED invoices

#### 4.4.3 Invoice Detail — History Tab
**Acceptance Criteria:**
- Chronological timeline of all status changes
- Each entry shows: status, timestamp, actor (system or user), notes if any

#### 4.4.4 Invoice Detail — Webhooks Tab
**Acceptance Criteria:**
- Lists all webhook events triggered for this invoice
- Each event shows: event type, delivery status (pending/delivered/failed), timestamp
- Expandable rows show routing config and any job errors per event
- Failed events show failure reason

#### 4.4.5 Payment Status Update
**User Story:** As a Business Admin, I want to update the payment status of an invoice so my records reflect actual payment receipt.

**Acceptance Criteria:**
- "Update Payment Status" action available from invoice detail
- Options: PAID, PENDING, REJECTED
- Selecting REJECTED requires a rejection reason (required field)
- On save, payment status badge updates immediately
- Action is restricted to Business Admins (not Team Members)

#### 4.4.6 Resend Invoice
**Acceptance Criteria:**
- Resend option available only for invoices in FAILED status
- Confirmation prompt before triggering
- On confirm, invoice workflow restarts from Transform
- Invoice status updates to CREATED and progress resets

#### 4.4.7 Retry from Step
**Acceptance Criteria:**
- Retry dropdown lists available steps: Transform, Validate, Sign, Transmit, Deliver
- Selecting a step and confirming resumes processing from that point
- Steps completed before the selected step are preserved
- Only available for FAILED invoices

---

### 4.5 ERP Synchronization Configuration

**Description:** Allow tenants to configure how processed invoices are sent back to their ERP system.

**User Story:** As a Business Admin, I want to configure an ERP sync endpoint so that my Tally/SAP system automatically receives confirmation when invoices are delivered.

**Acceptance Criteria:**
- Form fields: Name, Description, Enable/Disable toggle, Base URL, Endpoint path, HTTP Method (GET/POST/PUT/PATCH/DELETE)
- Optional: Custom headers (key-value pairs), Query parameters (key-value pairs)
- Authentication section with type selector:
  - None
  - Basic (username + password)
  - Bearer Token (token field)
  - API Key (key name, value, location: header or query)
  - OAuth2 (client ID, secret, token URL)
- Body template: Monaco code editor for JSON template with invoice field placeholders
- Response mapping: key-value pairs to extract fields from ERP response
- Retry policy: Max retries (number), Retry delay (ms), Retry on HTTP codes (multi-select)
- Save triggers validation; errors shown inline per field
- Super Admins can access and edit ERP config for any tenant from the admin panel

---

### 4.6 Webhook Configuration

**Description:** Allow tenants to configure how invoice lifecycle events are routed to their systems.

**User Story:** As a Business Admin, I want to configure which invoice events trigger webhook calls so my downstream systems stay in sync.

**Acceptance Criteria:**
- Webhook URL and secret displayed with copy buttons
- Secret is masked by default with a show/hide toggle
- Event routing table lists all invoice lifecycle events (Created, Validated, Signed, Transmitted, Delivered, Failed, etc.)
- Each event row has an enable/disable toggle and an action selector (e.g., POST to webhook URL)
- Changes saved with a Save button; unsaved changes prompt a confirmation before navigating away
- Webhook delivery history visible per event (status, timestamp, failure reason)

---

### 4.7 Team Management

**Description:** Invite and manage team members with role-based access.

**User Story:** As a Business Admin, I want to invite colleagues to the platform and assign them appropriate roles so they can work with invoices without full admin access.

**Acceptance Criteria:**
- Team list displays: name, email, role, status (Active/Invited/Suspended), last login
- Invite form: email, role selection (Admin / Member / Viewer), optional permissions
- Invite sends an activation email to the invitee
- Admin can edit a member's role and permissions after invitation
- Admin can suspend a member (immediately revokes access)
- Admin can remove a member (with confirmation prompt)
- Suspended users see an "account suspended" screen on login attempt
- Team Members cannot access the team management page

---

### 4.8 API Key Management

**Description:** Generate and manage API keys for programmatic access to the platform.

**User Story:** As a Business Admin, I want to generate an API key so my ERP system can submit invoices programmatically.

**Acceptance Criteria:**
- API keys list shows: key name, masked key value, created date, last used date, expiration date
- "Generate Key" button opens a modal to enter a key name and optional expiration
- Generated key is shown once in full; user must copy it before closing
- Rotate action generates a new key value and invalidates the old one (with confirmation)
- Revoke action permanently disables the key (with confirmation)
- Super Admins can manage API keys for any tenant

---

### 4.9 Tenant Management (Super Admin)

**Description:** Platform-level management of all registered tenant organizations.

#### 4.9.1 Tenant List
**Acceptance Criteria:**
- Table of all tenants: business name, TIN, ERP system, status, created date
- Status filter (active, suspended, onboarding, inactive)
- Search by business name or TIN
- Clicking a row opens tenant detail

#### 4.9.2 Create Tenant
**Acceptance Criteria:**
- Form: Business name, TIN, Business Registration Number, Contact email, Contact phone, ERP system
- On submit, tenant account is created and a welcome email sent to the contact email
- New tenant status is set to "onboarding"

#### 4.9.3 Tenant Detail
**Acceptance Criteria:**
- Displays all tenant fields (same as create form)
- Edit mode allows updating contact info and ERP system
- Activate / Suspend toggle with confirmation prompt
- Delete action (with confirmation; irreversible)
- Tabs for: Details, API Keys, ERP Sync Config, Webhook Config, Transactions

#### 4.9.4 Global Transaction Log
**Acceptance Criteria:**
- Lists all invoices across all tenants
- Additional column: Tenant name
- Same filtering, search, and detail drill-down as tenant transaction view
- Read-only; Super Admins cannot modify invoice state

---

### 4.10 System Health (Super Admin)

**Description:** Dashboard showing platform health and uptime metrics.

**Acceptance Criteria:**
- Uptime percentage displayed per service component
- Status indicators (operational, degraded, down) per component
- Last updated timestamp shown
- Auto-refreshes on a configurable interval

---

### 4.11 NRS Dictionary Management (Super Admin)

**Description:** Manage the field definitions used for NRS invoice validation.

**Acceptance Criteria:**
- Table of dictionary entries: field name, type, description, required flag
- Add, edit, and delete dictionary entries
- Changes are reflected in invoice validation logic on next processing run

---

### 4.12 API Testing Sandbox

**Description:** Safe environment to test API calls without affecting production data.

**Acceptance Criteria:**
- Available to both Business Admins and Super Admins (separate sandboxes)
- Allows crafting and sending API requests with configurable method, endpoint, headers, body
- Displays raw request and response
- Sandbox actions do not create real invoices or trigger NRS submissions

---

### 4.13 Batch Invoice Transmission *(Phase 2)*

**Description:** Allow tenants to submit multiple invoices in a single operation rather than individually via API.

**User Story:** As a Business Admin, I want to submit a batch of invoices at once so that high-volume invoice runs are processed efficiently without making individual API calls per invoice.

**Acceptance Criteria:**
- API accepts a batch payload containing an array of invoice objects in a single request
- Each invoice in the batch is processed independently through the NRS pipeline (Transform → Validate → Sign → Transmit → Deliver)
- Batch status view displays per-invoice outcome: success, failed, pending
- Summary metrics shown: total submitted, successful, failed
- Failed invoices within a batch can be retried individually or as a group without resubmitting successful ones
- Partial failures do not block or roll back successfully processed invoices in the same batch
- Batch transmission events are visible in the transaction log with a batch identifier

---

## 5. User Flows

### 5.1 First-Time Tenant Login
```
Created by Super Admin → Welcome email sent
        ↓
User clicks activation link → Set Password (forced via invite activation flow)
        ↓
Login with new credentials
        ↓
Onboarding Check
        ↓
  Incomplete? → /dashboard/onboarding → Step 1 → Step 2 → Step 3 → Complete
        ↓
  Complete? → /dashboard
```

### 5.2 Invoice Lifecycle
```
ERP submits invoice via API
        ↓
Invoice created (status: CREATED)
        ↓
Transform → Validate → Sign → Transmit → Deliver
        ↓                ↓
    Success           Failure → Status: FAILED
        ↓                          ↓
  QR Code generated       Dashboard shows error
        ↓                          ↓
ERP Sync triggered        Admin: Resend or Retry from step
        ↓
Status: SYNCED_TO_ERP / DELIVERED
```

### 5.3 Payment Status Update
```
Admin opens invoice detail
        ↓
Clicks "Update Payment Status"
        ↓
Selects PAID / PENDING / REJECTED
        ↓
  REJECTED? → Enter reason (required)
        ↓
Submit → Badge updates in real time
```

### 5.4 Team Member Invite
```
Admin clicks "Invite Member"
        ↓
Enters email, selects role, sets permissions
        ↓
System sends invite email
        ↓
Member clicks activation link → Sets password
        ↓
Member logged in → /dashboard (read-only view)
```

---

## 6. UX Requirements

| # | Requirement |
|---|-------------|
| UX-01 | All data tables shall show a skeleton loader while fetching and an empty state when no results exist |
| UX-02 | All destructive actions (delete, revoke, suspend, resend) shall require a confirmation dialog before executing |
| UX-03 | Toast notifications shall confirm successful actions and surface error messages for failed ones |
| UX-04 | Status badges shall be color-coded consistently: green (success/active), red (failed), yellow/gray (pending), blue (in-progress) |
| UX-05 | Copy-to-clipboard actions shall show a brief visual confirmation (icon change or toast) |
| UX-06 | Long-running operations (API calls, file uploads) shall show a loading spinner on the triggering button |
| UX-07 | Forms shall display inline validation errors on blur and on submit |
| UX-08 | The application shall be fully functional on desktop viewports (1280px+); mobile is not a primary target |
| UX-09 | Sidebar navigation shall highlight the active route |
| UX-10 | Session expiry shall display a modal prompt offering to log in again, not a silent redirect |

---

## 7. Technical Constraints

| # | Constraint |
|---|------------|
| TC-01 | Frontend: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| TC-02 | Authentication: NextAuth.js v5 with JWT strategy and httpOnly session cookies |
| TC-03 | API communication: Eden Treaty client proxying through Next.js API routes to middleware backend |
| TC-04 | State management: TanStack Query (React Query) for server state; no global client state library |
| TC-05 | Forms: React Hook Form + Zod for validation |
| TC-06 | Middleware backend: `https://e-invoicing-middleware.vercel.app` — all business logic lives here |
| TC-07 | The frontend does not connect directly to NRS or any external service; all calls proxy through the middleware |
| TC-08 | Super Admin API calls must include `x-admin-key` header; tenant calls use Bearer token from session |

---

## 8. Permissions Matrix

| Feature | Super Admin | Business Admin | Team Member |
|---------|:-----------:|:--------------:|:-----------:|
| View dashboard overview | ✓ | ✓ | ✓ |
| View transactions (own tenant) | ✓ | ✓ | ✓ |
| View transactions (all tenants) | ✓ | — | — |
| Update payment status | — | ✓ | — |
| Resend / Retry invoice | — | ✓ | — |
| Download QR code | ✓ | ✓ | ✓ |
| Configure ERP sync | ✓ | ✓ | — |
| Configure webhooks | ✓ | ✓ | — |
| Manage API keys | ✓ | ✓ | — |
| Invite / manage team members | — | ✓ | — |
| Create tenants | ✓ | — | — |
| Activate / suspend tenants | ✓ | — | — |
| View system health | ✓ | — | — |
| Manage NRS dictionary | ✓ | — | — |
| Access sandbox | ✓ | ✓ | ✓ |

---

## 9. Error Handling Requirements

| Scenario | Expected Behavior |
|----------|------------------|
| API call returns 401 | Clear session, redirect to login with "Session expired" message |
| API call returns 403 | Show "You don't have permission" toast; do not redirect |
| API call returns 500 | Show generic "Something went wrong" toast with a retry option where applicable |
| Network timeout | Show timeout error toast; do not leave UI in loading state |
| Invoice validation failure | Display field-level errors in invoice detail; set status to FAILED |
| ERP sync failure | Log error in job errors; surface in invoice detail Webhooks tab |
| Webhook delivery failure | Log failure reason; surface in Webhooks tab with timestamp |
| File upload format mismatch | Inline error before submission; do not call API |
| Form submission with invalid data | Inline field errors; do not submit until resolved |

---

## 10. Release Phases

### Phase 1 — Current (Shipped)
All core platform capabilities are live, including:
- Authentication (tenant login, super admin login, password reset, team member invite)
- Tenant onboarding (NRS OAuth, NRS credentials, webhook generation)
- Dashboard overview with KPI cards and recent invoices
- Outbound and inbound invoice list, detail view (Overview, History, Webhooks tabs)
- Payment status update (PAID / PENDING / REJECTED)
- Invoice resend and retry from step
- ERP sync configuration (endpoint, auth, body template, retry policy, response mapping)
- Webhook configuration and event routing
- Team management (invite, roles, permissions, suspend, remove)
- API key management (generate, rotate, revoke)
- Super Admin: tenant list, create, activate/suspend, global transaction log, ERP sync config, webhook config per tenant
- System health dashboard
- NRS dictionary management
- API testing sandbox (tenant + admin)

### Phase 2 — Batch Invoice Transmission
- Allow Business Admins to submit multiple invoices in a single API call or via a bulk upload (CSV/JSON)
- Batch processing status view: per-invoice outcome, success count, failure count
- Partial failure handling: failed invoices flagged individually without blocking successful ones
- Retry support for failed invoices within a batch

### Phase 3 — Security Hardening
- Multi-factor authentication (MFA) for Business Admin and Super Admin accounts
- Session activity log: track login events, IP addresses, and device metadata per user
- API key expiry enforcement and automated rotation reminders
- Rate limiting on invoice submission and API key usage
- Webhook secret rotation with zero-downtime handoff
- Audit log for Super Admin actions on tenant accounts

---

## 11. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | What is the exact retry interval for failed NRS transmissions? | Backend / NRS integration team | Open |
| 2 | Should Super Admins be able to manually trigger ERP sync for a tenant? | Product | Open |
| 3 | What is the maximum file size for SSL certificate and public key uploads? | Backend | Open |
| 4 | Should inbound invoice acknowledgment be automatic or require manual confirmation? | Product | Open |
| 5 | Are there audit log requirements for Super Admin actions on tenant accounts? | Compliance | Open |
| 6 | What events qualify for the NRS dictionary update cycle? | NRS integration team | Open |

---

## 12. Glossary

| Term | Definition |
|------|------------|
| IRN | Invoice Reference Number — unique NRS-assigned identifier per invoice |
| FIRS | Federal Inland Revenue Service — Nigerian tax authority |
| NRS | National Revenue Service — FIRS's e-invoicing processing platform |
| TIN | Tax Identification Number — Nigerian business tax identifier |
| ERP | Enterprise Resource Planning system (e.g. Tally, SAP, Oracle) |
| Tenant | A registered business client organization on the Heirs E-Invoicing Admin platform |
| Middleware | Heirs Technologies' backend service that proxies NRS and tenant operations |
| Webhook | An HTTP callback sent to a configured URL when an invoice event occurs |
| QR Code | A scannable image generated per delivered invoice for MBS360 app integration |
| Onboarding | The mandatory 3-step setup flow for new tenant accounts |
| Resend | Restarting the full invoice processing workflow from the beginning |
| Retry | Resuming invoice processing from a specific failed workflow step |
