import { getAdminApiClient, getTenantApiClient } from './client';
import type { InvoiceKeyType } from '@/types/invoice-key-config';
import type { OnboardingProfilePayload, BusinessSettingsPayload } from '@/types/tenant-profile';

export function createTenantApi() {
  const api = getTenantApiClient()

  return {
    login: (email: string, password: string) =>
      api.v1.auth.post({ email, password }),

    loginTeamMember: (email: string, password: string) =>
      (api as any).v1.auth['team-member'].post({ email, password }),

    forgotPassword: (email: string) =>
      (api as any).v1.auth['forgot-password'].post({ email }),

    validateResetToken: (token: string) =>
      (api as any).v1.auth['validate-reset-token']({ token }).get(),

    resetPassword: (token: string, password: string) =>{
      return (api as any).v1.auth['reset-password'].post({ token, password })},

    setPassword: (token: string, password: string) =>
      (api as any).v1.auth['set-password'].post(
        { password },
        { headers: { Authorization: `Bearer ${token}` } }
      ),

    getMe: () =>
      api.v1.auth.me.get(),

    getMeWithToken: (token: string) =>
      api.v1.auth.me.get({
        headers: { Authorization: `Bearer ${token}` },
      }),

    // The generated server.d.ts types this as v1.auth.oauth.firs (stale
    // codegen) — the real backend route is /v1/auth/firs-oauth, confirmed
    // against the live OpenAPI docs and a direct request (the old path
    // 404s, this one correctly validates the body).
    firsOAuth: (email: string, password: string, mock = false) =>
      (api as any).v1.auth['firs-oauth'].post({ email, password, mock }),

    updateCredentials: (tenantId: string, certificate: string, publicKey: string) =>
      (api as any).v1.tenants({ tenantId })['credentials'].put({ certificate, publicKey }),

    putFirsCredentials: (tenantId: string, certificate: string, publicKey: string, mock = false) =>
      (api as any).v1.tenants({ tenantId })['firs-credentials'].put({ certificate, publicKey, mock }),

    getOnboarding: (tenantId: string) =>
      api.v1.tenants({ tenantId }).onboarding.get(),

    generateWebhook: (tenantId: string, options?: {
      lifespan?: string;
      invoiceIdKey?: string;
      webhookAuthMode?: string;
      defaultEventType?: string;
    }) =>
      (api as any).v1.tenants({ tenantId }).webhook.generate.post({
        ...(options?.lifespan ? { lifespan: options.lifespan } : {}),
        ...(options?.invoiceIdKey ? { invoiceIdKey: options.invoiceIdKey } : {}),
        ...(options?.webhookAuthMode ? { webhookAuthMode: options.webhookAuthMode } : {}),
        ...(options?.defaultEventType ? { defaultEventType: options.defaultEventType } : {}),
      }),

    getWebhookConfig: (tenantId: string) =>
      (api as any).v1.tenants({ tenantId }).webhook.config.get(),

    updateOnboardingProfile: (tenantId: string, payload: OnboardingProfilePayload) =>
      (api as any).v1.tenants({ tenantId }).onboarding.profile.put(payload),

    getBusinessSettings: (tenantId: string) =>
      (api as any).v1.tenants({ tenantId }).settings.business.get(),

    updateBusinessSettings: (tenantId: string, payload: BusinessSettingsPayload) =>
      (api as any).v1.tenants({ tenantId }).settings.business.put(payload),

    getStates: () => (api as any).v1.invoice.resources.states.get(),

    getLgas: () => (api as any).v1.invoice.resources.lgas.get(),

    // Unified key-config endpoint covering all NRS document types — replaces
    // the older invoice-id-key / id-key-map / reference-id-key-map routes.
    getKeyConfig: (tenantId: string, keyType?: InvoiceKeyType) =>
      (api as any).v1.tenants({ tenantId })['key-config'].get({ query: keyType ? { keyType } : {} }),

    updateKeyConfig: (
      tenantId: string,
      payload: { keyType: InvoiceKeyType; idKey: string; referenceIdKey?: string },
    ) => (api as any).v1.tenants({ tenantId })['key-config'].put(payload),

    updatePaymentStatus: (irn: string, data: {
      status: string;
      paymentDate?: string;
      paymentAmount?: number;
      paymentReference?: string;
    }) =>
      (api as any).v1.invoicing({ irn }).status.patch(data),

    testWebhook: (tenantId: string, testPayload?: Record<string, unknown>, authStrategy?: string) =>
      (api as any).v1.tenants({ tenantId }).webhook.test.post({
        testPayload: testPayload || {},
        ...(authStrategy ? { authStrategy } : {}),
      }),

    completeOnboading: (tenantId: string, activationPayload: Record<string, any>) =>
      api.v1.tenants({ tenantId }).onboarding.patch(activationPayload || {}),

    // Invoice endpoints (nested under v1.workflow.invoices)
    getOutboundInvoices: (query?: { status?: string; page?: string; limit?: string; from?: string; to?: string }) =>
      api.v1.workflow.invoices.outbound.get({ query: query || {} }),

    getOutboundInvoice: (irn: string) =>
      api.v1.workflow.invoices.outbound({ irn }).get(),

    getInboundInvoices: (query?: { status?: string; page?: string; limit?: string; from?: string; to?: string; paymentStatus?: string }) =>
      api.v1.workflow.invoices.inbound.get({ query: query || {} }),

    getInboundInvoice: (irn: string) =>
      api.v1.workflow.invoices.inbound({ irn }).get(),

    getInvoices: (query?: { page?: string; limit?: string; type?: string; status?: string; paymentStatus?: string; search?: string; from?: string; to?: string }) =>
      (api as any).v1.workflow.invoices.get({ query: query || {} }),

    getInvoiceMetrics: () =>
      (api as any).v1.workflow.invoices.metrics.get(),

    requestEmailChange: (tenantId: string, newEmail: string, currentPassword?: string) =>
      (api as any).v1.tenants({ tenantId }).settings.email['request-change'].post({ newEmail, ...(currentPassword && { currentPassword }) }),

    verifyEmailChange: (tenantId: string, token: string) =>
      (api as any).v1.tenants({ tenantId }).settings.email.verify.post({ _u: token }),

    getWebhookEvents: (query?: { page?: string; limit?: string; status?: string; eventType?: string; irn?: string; search?: string }) =>
      (api as any).v1.webhook.events.get({ query: query || {} }),

    getWebhookEvent: (eventId: string) =>
      (api as any).v1.webhook.events[eventId].get(),

    resendOutboundInvoice: (irn: string) =>
      api.v1.workflow.invoices.outbound({ irn }).resend.post({}),

    retryFromStep: (irn: string, fromStep: string) =>
      api.v1.workflow.invoices.outbound({ irn })['retry-from-step'].post({ fromStep }),

    // Event routing
    getEventRouting: (tenantId: string) => {
      const adminApi = getAdminApiClient()
      return (adminApi as any).v1.admin.tenants[tenantId]['event-routing'].get()
    },

    // ERP Sync endpoints
    getErpSyncConfig: (tenantId: string) =>
      api.v1.tenants({ tenantId })['erp-sync'].get(),

    saveErpSyncConfig: (tenantId: string, config: {
      name: string;
      enabled: boolean;
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
      baseUrl: string;
      endpoint: string;
      description?: string;
      headers?: Record<string, string>;
      queryParams?: Record<string, string>;
      bodyTemplate?: string;
      authentication?: {
        type: 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2';
        token?: string;
        username?: string;
        password?: string;
        apiKeyName?: string;
        apiKeyValue?: string;
        apiKeyLocation?: 'header' | 'query';
      };
      timeout?: number;
      retryConfig?: { maxRetries: number; retryDelay: number; retryOn?: number[] };
      responseMapping?: Record<string, string>;
    }) =>
      api.v1.tenants({ tenantId })['erp-sync'].put(config),

    // Sandbox / Workflow endpoints
    sandboxTransform: (invoice: any, sourceType?: string) =>
      api.v1.workflow.transform.post({ invoice, source_type: sourceType }),

    sandboxOutbound: () =>
      api.v1.workflow.outbound.post({}),

    sandboxInbound: () =>
      api.v1.workflow.inbound.post({}),

    // Team management endpoints
    getTeamMembers: (tenantId: string, query?: { status?: string; page?: string; limit?: string; role?: string }) =>
      api.v1.tenants({ tenantId }).team.get({ query: query || {} }),

    getTeamMember: (tenantId: string, userId: string) =>
      api.v1.tenants({ tenantId }).team({ userId }).get(),

    inviteTeamMember: (tenantId: string, data: {
      email: string;
      role: 'admin' | 'member' | 'viewer' | string;
      firstName: string;
      lastName: string;
      permissions?: string[];
    }) =>
      api.v1.tenants({ tenantId }).team.post(data),

    updateTeamMember: (tenantId: string, userId: string, data: {
      role?: 'admin' | 'member' | 'viewer';
      status?: 'active' | 'suspended';
      firstName?: string;
      lastName?: string;
      permissions?: string[];
    }) =>
      api.v1.tenants({ tenantId }).team({ userId }).patch(data),

    removeTeamMember: (tenantId: string, userId: string) =>
      api.v1.tenants({ tenantId }).team({ userId }).delete(),

    resendInvite: (tenantId: string, userId: string) =>
      api.v1.tenants({ tenantId }).team({ userId })['resend-invite'].post({}),

    // API Key management
    getApiKeys: (tenantId: string) =>
      api.v1.tenants({ tenantId })['api-keys'].get(),

    createApiKey: (tenantId: string, data: {
      name: string;
      scopes?: string[];
      expiresInDays?: number;
    }) =>
      api.v1.tenants({ tenantId })['api-keys'].post(data),

    rotateApiKey: (tenantId: string, keyId: string, data?: {
      reason?: string;
      sendEmail?: boolean;
    }) =>
      api.v1.tenants({ tenantId })['api-keys']({ keyId }).rotate.post(data || {}),

    revokeApiKey: (tenantId: string, keyId: string, reason?: string) =>
      api.v1.tenants({ tenantId })['api-keys']({ keyId }).delete({ reason }),

    // Tenant profile update
    updateTenant: (tenantId: string, data: {
      businessName?: string;
      contactEmail?: string;
      contactPhone?: string;
      erpSystem?: string;
      webhookUrl?: string;
      webhookEnabled?: boolean;
      features?: { autoFix?: boolean; maxRetries?: number; qrCodeGeneration?: boolean };
      limits?: { monthlyInvoiceLimit?: number; apiRateLimit?: number };
      metadata?: Record<string, any>;
    }) =>
      api.v1.tenants({ tenantId }).patch(data),
  }
}
