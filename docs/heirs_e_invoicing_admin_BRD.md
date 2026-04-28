# Business Requirements Document (BRD)
## Heirs E-Invoicing Admin — E-Invoicing Management Platform

**Document Version:** 1.0
**Date:** February 6, 2026
**Prepared by:** E-Invoicing Development Team
**Organization:** Heirs Technologies

---

## 1. Executive Summary

Heirs E-Invoicing Admin is a Software-as-a-Service (SaaS) e-invoicing management platform built for Nigerian businesses. It enables organizations to comply with the Federal Inland Revenue Service (FIRS) National Revenue Service (NRS) mandate for electronic invoicing by managing the complete invoice lifecycle — from issuance and validation through digital signing, transmission, delivery, and payment tracking.

The platform serves two primary audiences: Heirs Technologies (operating as Super Admins) and their business clients (Tenants) who use the platform to manage outbound and inbound invoices across their organizations.

---

## 2. Business Objectives

| # | Objective | Priority |
|---|-----------|----------|
| 1 | Enable Nigerian businesses to comply with FIRS/NRS e-invoicing regulations | Critical |
| 2 | Automate the invoice lifecycle from ERP submission to NRS delivery | Critical |
| 3 | Provide real-time visibility into invoice processing status and errors | High |
| 4 | Support bi-directional integration with tenant ERP systems (Tally, SAP, Oracle, etc.) | High |
| 5 | Allow platform administrators to manage and monitor all tenants centrally | High |
| 6 | Enable tenants to manage their teams with role-based access control | Medium |
| 7 | Provide webhook-based event notifications for downstream system integration | Medium |
| 8 | Facilitate error recovery and invoice reprocessing without manual intervention | High |

---

## 3. Scope

### In Scope
- Tenant onboarding and NRS authentication
- Outbound invoice lifecycle management (Transform → Validate → Sign → Transmit → Deliver)
- Inbound invoice reception and acknowledgment
- Payment status tracking per invoice
- Webhook event configuration and delivery
- ERP system synchronization configuration
- Super admin tenant lifecycle management
- Team member management and role-based access control
- API key and credential management
- System health monitoring (admin)
- NRS dictionary management

### Out of Scope
- Direct ERP software development or modification
- Mobile application development
- Payment gateway integration or payment processing
- Tax filing or remittance
- Accounting/GL functionality

---

## 4. Stakeholders

| Stakeholder | Role | Interest |
|-------------|------|----------|
| Heirs Technologies | Platform Owner / Super Admin | Platform uptime, tenant growth, compliance |
| Business Tenants (Admin) | Primary Business Users | Invoice compliance, ERP sync, team management |
| Business Tenants (Team Members) | Operational Users | Transaction visibility, status tracking |
| FIRS / NRS | Regulatory Authority | Invoice validation and transmission compliance |
| ERP Systems (Tally, SAP, Oracle, etc.) | External Integrators | Sync of processed invoice data back to accounting |

---

## 5. User Roles and Permissions

### 5.1 Super Admin
- Platform-level administrator operated by Heirs Technologies
- Authenticated via a secure login key (not email/password)
- Full access to all tenants, system health, and configuration

**Capabilities:** Create/read/update/delete tenants; activate/suspend accounts; configure ERP sync per tenant; manage API keys and webhooks per tenant; view all global transaction logs; manage NRS dictionary; access system settings and health dashboard.

### 5.2 Business Admin (Tenant Owner)
- Primary business user for each registered organization
- Full control over their own tenant workspace

**Capabilities:** Complete onboarding; manage transactions (view, resend, retry); configure ERP sync; manage webhook events; invite/manage team members; manage API keys; update payment status; view/download invoices and QR codes.

### 5.3 Business Team Member
- Operational user invited by a Business Admin
- Read-focused access with limited operational capability

**Capabilities:** View transactions and invoice details; download QR codes; access sandbox; view own profile. Cannot configure integrations, manage teams, or modify settings.

---

## 6. Functional Requirements

### 6.1 Authentication & Access Control

| ID | Requirement |
|----|-------------|
| FR-AUTH-01 | The system shall support email/password authentication for tenant users |
| FR-AUTH-02 | The system shall support login-key-based authentication for Super Admins |
| FR-AUTH-03 | The system shall enforce role-based access control (SUPER_ADMIN, BUSINESS_ADMIN, BUSINESS_TEAM_MEMBER) at the route level |
| FR-AUTH-04 | The system shall support password reset via email |
| FR-AUTH-05 | The system shall support team member invite-based account activation |
| FR-AUTH-06 | Sessions shall expire after 30 days of inactivity |
| FR-AUTH-07 | The system shall redirect unauthenticated users to the appropriate login page |

### 6.2 Tenant Onboarding

| ID | Requirement |
|----|-------------|
| FR-ONB-01 | Super Admins shall be able to create new tenant accounts with business name, TIN, registration number, contact email, phone, and ERP system |
| FR-ONB-02 | Newly created tenants shall be prompted through a 3-step onboarding flow on first login |
| FR-ONB-03 | Step 1: The system shall authenticate the tenant against the FIRS/NRS portal using provided credentials and retrieve business details |
| FR-ONB-04 | Step 2: The system shall accept and store an SSL certificate and public key for NRS digital signing |
| FR-ONB-05 | Step 3: The system shall auto-generate a unique webhook URL and secret token for the tenant |
| FR-ONB-06 | Onboarding shall be resumable; the system shall return to the last incomplete step on re-login |
| FR-ONB-07 | Tenants shall not access the main dashboard until all onboarding steps are complete |

### 6.3 Invoice Lifecycle Management (Outbound)

| ID | Requirement |
|----|-------------|
| FR-INV-01 | The system shall accept invoice submissions from tenant ERP systems via API |
| FR-INV-02 | The system shall process outbound invoices through a defined workflow: Transform → Validate → Sign → Transmit → Deliver |
| FR-INV-03 | Each workflow step shall update the invoice status accordingly (CREATED, VALIDATED, SIGNED, TRANSMITTED, DELIVERED) |
| FR-INV-04 | Validation failures shall set the invoice status to FAILED and expose error details |
| FR-INV-05 | The system shall generate a QR code for each successfully delivered invoice |
| FR-INV-06 | The system shall expose a resend option to restart the full workflow for failed invoices |
| FR-INV-07 | The system shall expose a step-level retry option to resume from a specific failed step |
| FR-INV-08 | The system shall track and display last known job errors (action, error message, timestamp) |
| FR-INV-09 | The system shall display validation error details (field-level, message, code) |

### 6.4 Invoice Management (Inbound)

| ID | Requirement |
|----|-------------|
| FR-INB-01 | The system shall receive and store inbound invoices addressed to registered tenants |
| FR-INB-02 | Inbound invoices shall be trackable by status: CREATED → ACKNOWLEDGED → DOWNLOADED → SYNCED_TO_ERP → PAID |
| FR-INB-03 | Inbound invoices shall include supplier TIN, invoice number, IRN, amount, currency, issue date, and due date |

### 6.5 Payment Status Management

| ID | Requirement |
|----|-------------|
| FR-PAY-01 | Business Admins shall be able to update the payment status of any invoice to PAID, PENDING, or REJECTED |
| FR-PAY-02 | Rejected payments shall require a reason to be entered |
| FR-PAY-03 | Payment status updates shall be reflected in the invoice list and detail views in real time |

### 6.6 Transaction Visibility

| ID | Requirement |
|----|-------------|
| FR-TXN-01 | The system shall display all outbound and inbound invoices in a unified transactions view with tab-based filtering |
| FR-TXN-02 | The transactions view shall display aggregate KPI counts: total, outbound, inbound, pending, failed |
| FR-TXN-03 | Users shall be able to filter invoices by status, type, and search by IRN, invoice number, or customer/supplier name |
| FR-TXN-04 | Selecting an invoice shall open a detailed view with: overview, status history timeline, and webhook event tabs |
| FR-TXN-05 | The system shall support QR code download for delivered invoices |
| FR-TXN-06 | Admin users shall have access to a global transaction log across all tenants |

### 6.7 ERP Synchronization

| ID | Requirement |
|----|-------------|
| FR-ERP-01 | Business Admins shall be able to configure an ERP sync endpoint (URL, HTTP method, headers, query params) |
| FR-ERP-02 | The system shall support authentication modes for ERP sync: None, Basic, Bearer Token, API Key, OAuth2 |
| FR-ERP-03 | Users shall be able to define a request body template using invoice field placeholders for dynamic mapping |
| FR-ERP-04 | The system shall support retry configuration per ERP sync endpoint (max retries, delay, retry HTTP codes) |
| FR-ERP-05 | Response mapping shall allow extraction of ERP confirmation/receipt numbers from sync responses |
| FR-ERP-06 | Super Admins shall be able to configure ERP sync settings on behalf of any tenant |

### 6.8 Webhook Management

| ID | Requirement |
|----|-------------|
| FR-WHK-01 | Each tenant shall have a unique webhook URL and secret generated during onboarding |
| FR-WHK-02 | Business Admins shall be able to view their webhook URL and secret |
| FR-WHK-03 | Users shall be able to configure event routing rules — mapping invoice lifecycle events to webhook actions |
| FR-WHK-04 | The system shall track webhook delivery status (pending, delivered, failed) per event |
| FR-WHK-05 | Failed webhook deliveries shall log the failure reason and timestamp |

### 6.9 Team Management

| ID | Requirement |
|----|-------------|
| FR-TEAM-01 | Business Admins shall be able to invite team members via email |
| FR-TEAM-02 | Team members shall be assigned roles (Admin, Member, Viewer) with configurable granular permissions |
| FR-TEAM-03 | Business Admins shall be able to suspend or remove team members |
| FR-TEAM-04 | The team management view shall display member status (Active, Invited, Suspended) and last login |

### 6.10 API Key Management

| ID | Requirement |
|----|-------------|
| FR-API-01 | Business Admins shall be able to generate, rotate, and revoke API keys for programmatic platform access |
| FR-API-02 | API key metadata shall include creation date, last used date, and expiration |
| FR-API-03 | Super Admins shall be able to manage API keys for any tenant |

### 6.11 Super Admin Platform Management

| ID | Requirement |
|----|-------------|
| FR-ADM-01 | Super Admins shall be able to view all registered tenants with status and business details |
| FR-ADM-02 | Super Admins shall be able to activate or suspend tenant accounts |
| FR-ADM-03 | Super Admins shall be able to view system health metrics (uptime, status indicators) |
| FR-ADM-04 | Super Admins shall be able to manage the NRS dictionary (field definitions and mappings) |
| FR-ADM-05 | Super Admins shall have access to an API testing sandbox |

---

## 7. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | Security | All API communication shall use HTTPS/TLS. Bearer tokens must be transmitted via Authorization headers only |
| NFR-02 | Security | Session tokens shall be stored in httpOnly, SameSite cookies. No sensitive credentials stored in localStorage |
| NFR-03 | Security | NRS SSL certificates and public keys shall be stored encrypted |
| NFR-04 | Security | Super Admin access shall require a dedicated login key separate from regular user credentials |
| NFR-05 | Performance | Invoice list views shall support server-side pagination with a default page size of 10–25 records |
| NFR-06 | Performance | API proxy calls shall return responses within 3 seconds under normal load |
| NFR-07 | Usability | The system shall display clear loading, error, and empty states for all data-fetching operations |
| NFR-08 | Usability | Status badges shall use consistent, color-coded visual language across all views |
| NFR-09 | Reliability | Failed ERP sync requests shall be retried per the configured retry policy |
| NFR-10 | Scalability | The platform shall support multi-tenant isolation; tenants shall not have visibility into other tenants' data |
| NFR-11 | Compliance | All invoice processing shall conform to the FIRS/NRS e-invoicing standard and IRN schema |
| NFR-12 | Auditability | The system shall maintain a full status history log per invoice, including timestamps for each state change |

---

## 8. Integration Requirements

### 8.1 FIRS/NRS Portal
- **Purpose:** Authenticate tenants and provision their e-invoicing identity
- **Integration type:** OAuth-based authentication via FIRS portal
- **Data exchanged:** Business ID, name, TIN, sector, ERP system type, IRN template
- **Trigger:** Step 1 of tenant onboarding

### 8.2 NRS Invoice Processing Pipeline
- **Purpose:** Submit invoices for validation, digital signing, and transmission
- **Integration type:** REST API via middleware backend
- **Workflow stages:** Transform → Validate → Sign → Transmit → Deliver

### 8.3 Tenant ERP Systems (Tally, SAP, Oracle, custom)
- **Purpose:** Sync processed invoice data back to the tenant's accounting system
- **Integration type:** Configurable outbound HTTP (GET/POST/PUT/PATCH/DELETE)
- **Auth types:** None, Basic, Bearer, API Key, OAuth2
- **Data exchanged:** Invoice data via user-defined body template; response mapped to extract receipt IDs

### 8.4 Middleware Backend API
- **URL:** `https://e-invoicing-middleware.vercel.app`
- **Purpose:** Central backend for all tenant and admin operations
- **Auth:** Bearer tokens (tenant) and `x-admin-key` header (super admin)

---

## 9. Data Requirements

### Key Entities

| Entity | Key Fields |
|--------|-----------|
| Tenant | Business name, TIN, BRN, contact email/phone, ERP system, status, webhook config |
| User | Email, role, associated tenant, session token |
| Invoice (Outbound) | IRN, invoice number, customer, amount, currency, status, workflow state, QR code, errors |
| Invoice (Inbound) | IRN, invoice number, supplier TIN, amount, status, received date |
| Webhook Event | Event type, delivery status, failure reason, routing config, job errors |
| ERP Sync Config | Endpoint, auth type, body template, retry policy, response mapping |
| Team Member | Email, role, permissions, status, invite/login history |
| API Key | Key value, creation date, last used, expiration |

### Data Sensitivity

| Data | Handling Requirement |
|------|---------------------|
| NRS SSL certificates and public keys | Encrypted at rest |
| API keys and webhook secrets | Masked in UI, encrypted at rest |
| Session tokens | Stored in httpOnly cookies, never exposed to JavaScript |
| User passwords | Hashed; never stored or transmitted in plaintext |

---

## 10. Assumptions and Constraints

| # | Type | Description |
|---|------|-------------|
| 1 | Assumption | All tenants are registered Nigerian businesses with a valid TIN and FIRS/NRS account |
| 2 | Assumption | The FIRS/NRS OAuth portal API is available and stable for production use |
| 3 | Assumption | Tenant ERP systems expose HTTP endpoints capable of receiving invoice sync data |
| 4 | Constraint | Invoice IRNs are unique and immutable once assigned by the NRS system |
| 5 | Constraint | Only Business Admins may complete onboarding; team members cannot |
| 6 | Constraint | Super Admins cannot submit or process invoices — administrative functions only |
| 7 | Constraint | ERP sync is one-directional (platform → ERP); ERP-to-platform sync is out of scope |
| 8 | Constraint | QR code generation requires a successfully delivered invoice (DELIVERED status) |

---

## 11. Success Metrics / Acceptance Criteria

| Metric | Target |
|--------|--------|
| Tenant onboarding completion rate | ≥ 90% of created tenants complete all 3 onboarding steps |
| Invoice delivery success rate | ≥ 95% of submitted invoices reach DELIVERED status without manual intervention |
| Webhook delivery success rate | ≥ 98% of webhook events delivered within 60 seconds |
| ERP sync success rate | ≥ 95% of configured ERP sync calls succeed on first attempt |
| Role-based access violations | 0 unauthorized page or data accesses |
| Mean time to error visibility | ≤ 30 seconds from job failure to visible error in dashboard |

---

## 12. Glossary

| Term | Definition |
|------|------------|
| IRN | Invoice Reference Number — unique identifier assigned by the NRS system |
| FIRS | Federal Inland Revenue Service — Nigerian tax authority |
| NRS | National Revenue Service — FIRS's e-invoicing platform |
| TIN | Tax Identification Number — Nigerian business identifier |
| ERP | Enterprise Resource Planning — accounting/operations software (e.g. Tally, SAP) |
| Tenant | A registered business organization using the Heirs E-Invoicing Admin platform |
| Middleware | Heirs Technologies' backend API that proxies NRS and tenant operations |
| Webhook | An HTTP callback triggered by invoice lifecycle events |
| QR Code | A scannable code generated per invoice, used with the MBS360 mobile app |
