# Heirs E-Invoicing Admin — Tenant User Journey

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

Businesses access the platform as **Tenants** — each tenant is a separate company with its own team, ERP configuration, API keys, and transaction history. Tenants are created and managed by the Super Admin.

---

## About This Document

This document covers the full user journey for **Tenants** on the Heirs E-Invoicing Admin platform, starting from the admin-initiated account activation. There are two tenant-level roles:

- **Business Admin** — full access to the tenant account, including configuration, team management, and settings
- **Business Team Member** — limited read/view access within the tenant account

Role-specific deviations are noted inline throughout and summarised in the final section.

For the Super Admin journey, see `admin-user-journey.md`.

---

## Table of Contents

1. [Entry Point — Admin-Initiated Activation](#1-entry-point--admin-initiated-activation)
2. [Onboarding](#2-onboarding)
3. [Dashboard](#3-dashboard)
4. [Webhook Configuration](#4-webhook-configuration)
5. [ERP Sync](#5-erp-sync)
6. [Transactions](#6-transactions)
7. [Sandbox / Testing](#7-sandbox--testing)
8. [API Keys](#8-api-keys)
9. [Team Management](#9-team-management)
10. [Profile](#10-profile)
11. [Session End](#11-session-end)
12. [Returning Tenant Login](#12-returning-tenant-login)
13. [Team Member Access Deviations](#13-team-member-access-deviations)

---

### 1. Entry Point — Admin-Initiated Activation

- Super Admin creates the tenant account from `/admin/tenants`
- Tenant receives an automated email containing a unique, time-limited **activation link**
- Tenant clicks the link → redirected to the tenant platform URL
- Presented with a **Set Password** screen:
  - **Password** field
  - **Confirm Password** field
  - Validation: passwords must match and meet complexity requirements
- On failure → inline error shown; tenant corrects and resubmits
- On success → account activated; tenant automatically redirected to `/dashboard/onboarding`

---

### 2. Onboarding

**Route:** `/dashboard/onboarding`

Mandatory multi-step setup. The tenant cannot access most dashboard features until all steps are complete. Progress is persisted — the tenant can exit and resume at any point.

**Step 1 — NRS/FIRS OAuth Authentication**
- Tenant initiates OAuth flow with the National Revenue Service (NRS) / Federal Inland Revenue Service (FIRS)
- Redirected to the NRS/FIRS authorization page
- Grants the platform permission to act on the tenant's behalf
- On success → OAuth tokens stored; step marked complete

**Step 2 — NRS Credentials**
- Tenant uploads their NRS-issued:
  - **Certificate file** — public certificate for invoice signing
  - **Private key file** — used to sign invoice payloads
- Platform validates both files
- On success → credentials stored securely; step marked complete

**Step 3 — Webhook URL Setup**
- Platform auto-generates a unique **webhook URL** for the tenant
- Tenant copies and saves the URL to configure in their ERP or receiving system
- Step marked complete upon acknowledgement

**Completion**
- All three steps done → onboarding badge cleared
- Full dashboard unlocked — tenant can now access all features

---

### 3. Dashboard

**Route:** `/dashboard`

**KPI Cards**
- Total transactions processed
- Transaction status breakdown (submitted, failed, pending, rejected)
- ERP sync health status

Real-time overview of the tenant's e-invoicing activity and the entry point for navigating to all other features.

*(Team Member: same view, read-only)*

---

### 4. Webhook Configuration

**Route:** `/dashboard/settings/webhook`

*(Business Admin only)*

After reviewing the dashboard, the tenant configures their webhook integration in detail.

**Step 1 — Pass in Invoice ID**
- Tenant enters the **Invoice ID** to associate with the webhook test configuration
- This ties the webhook setup to a real or test invoice reference

**Step 2 — Regenerate Webhook URL and Secret**
- Tenant triggers regeneration of:
  - **Webhook URL** — the new endpoint the platform will POST events to
  - **Webhook Secret** — used to sign outgoing payloads so the receiving system can verify authenticity
- Both values are displayed once — tenant copies and stores them securely
- Previous URL and secret are immediately invalidated

**Step 3 — Test**
- Tenant fires a test event to the newly configured webhook endpoint
- Platform sends a sample payload to the URL
- Tenant verifies receipt on the receiving end (their ERP or backend system)
- Test result (success / failure / timeout) is displayed in the UI

**Step 4 — Map**
- Tenant defines which platform events should trigger the webhook:
  - Invoice submitted
  - Invoice accepted
  - Invoice rejected
  - Status changed
  - Payment received
- Each event can be toggled on or off independently
- Mapping saved — the webhook will now fire only for the selected events

---

### 5. ERP Sync

**Route:** `/dashboard/erp-sync`

- View all connected ERP integrations (e.g. Tally, SAP, NetSuite, Oracle)
- Monitor sync health per ERP: last sync time, error count, current status
- Connect a new ERP integration if not already configured
- Review sync logs for failed or partial syncs

*(Team Member: read-only)*

**Map Incoming Events to Workflows** *(Business Admin only)*

For each ERP-emitted event, the tenant defines the corresponding workflow action within the platform:

| ERP Event | Platform Workflow Action |
|---|---|
| New invoice created | Submit invoice to NRS |
| Payment received | Mark IRN as settled |
| Credit note issued | Raise credit note against original IRN |
| Invoice updated | Resubmit updated invoice payload |

- Mapping is saved per ERP type
- Ensures that ERP activity automatically drives the correct downstream e-invoicing behaviour without manual intervention

---

### 6. Transactions

**Route:** `/dashboard/transactions`

- Full list of all e-invoicing transactions for the tenant
- Each record shows: IRN, invoice reference, status, submission date, ERP source
- **Filters:**
  - Status (submitted, failed, pending, rejected)
  - Date range
  - IRN or invoice ID

**Transaction Detail** — `/dashboard/transactions/[irn]`
- Full transaction record: payload, submission timestamp, NRS response, status history
- **Resend** — if a transaction failed, the admin can trigger a resubmission directly from the detail page *(Business Admin only)*

*(Team Member: view only, no resend)*

---

### 7. Sandbox / Testing

**Route:** `/dashboard/sandbox`

- Make test API calls in an isolated sandbox environment
- Construct and submit test invoice payloads
- Inspect full request and response payloads
- Validate that ERP-generated invoice data passes NRS validation rules before going live
- No production data is affected

Available to both Business Admin and Business Team Member.

---

### 8. API Keys

**Route:** `/dashboard/settings/api-keys`

*(Business Admin only)*

**Create a New API Key**
- Assign a name/label to the key
- Set an expiration date (optional)
- Key value is shown once on creation — tenant must copy it immediately

**View Existing Keys**
- Name, creation date, expiration date, last used timestamp, call count

**Rotate a Key**
- Generates a new key value for an existing key entry
- Old value is immediately invalidated upon rotation

**Revoke a Key**
- Permanently disables a key (e.g. if compromised or no longer needed)

---

### 9. Team Management

**Route:** `/dashboard/team`

*(Business Admin only)*

- View all team members associated with the tenant account
- Each member shows: name, email, assigned role, account status

**Inviting a New Member**
- Admin enters the new member's email address and assigns a role:
  - **Admin** — full access equivalent to Business Admin
  - **Member** — standard write access
  - **Viewer** — read-only access
- Invitation email sent to the new member
- Member clicks the link → sets password → lands on the dashboard with assigned permissions

**Managing Existing Members** — `/dashboard/team/[id]`
- Update a member's role
- Remove a member from the team (revokes their access immediately)

---

### 10. Profile

**Route:** `/dashboard/profile`

*(Business Admin only)*

- View and update the business profile:
  - Business name
  - Contact email
  - Other registered business details
- Changes are saved immediately upon submission

---

### 11. Session End

- Tenant clicks the avatar/logout control in the header
- Confirmation dialog: "Are you sure you want to log out?"
- On confirm → session cleared; redirected to `/auth/login`

---

### 12. Returning Tenant Login

For tenants returning after their initial setup:

**Route:** `/auth/login`

- Enter registered email and password
- On success → redirected to `/dashboard`

**Forgotten Password Flow**
1. Click "Forgot password" on the login page → `/auth/forgot-password`
2. Enter registered email address
3. Platform sends a password reset link to the email
4. Click the link → `/auth/reset-password?token=...`
5. Enter new password + confirm new password
6. On success → redirected to `/auth/login` to sign in with the new password

---

### 13. Team Member Access Deviations

The following table summarises how access differs between Business Admin and Business Team Member across all major features:

| Feature | Business Admin | Business Team Member |
|---|---|---|
| Dashboard | Full view | Read-only |
| Onboarding | Completes setup | N/A — joins via invite after setup |
| Webhook Configuration | Full access (configure, test, map) | No access |
| ERP Sync | Configure + map events to workflows | Read-only |
| Transactions | View + resend failed | View only |
| Transaction Detail | View + resend | View only |
| Sandbox | Full access | Full access |
| API Keys | Create / rotate / revoke | No access |
| Team Management | Invite / edit / remove members | No access |
| Profile | Edit | Read-only |
| Settings | Full access | No access |
