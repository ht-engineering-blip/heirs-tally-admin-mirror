import { getTenantApiClient, getAdminApiClient } from './client';

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

    resetPassword: (token: string, password: string) =>
      (api as any).v1.auth['reset-password'].post({ token, password }),

    getMe: () =>
      api.v1.auth.me.get(),

    getMeWithToken: (token: string) =>
      api.v1.auth.me.get({
        headers: { Authorization: `Bearer ${token}` },
      }),

    firsOAuth: (email: string, password: string, mock = false) =>
      api.v1.auth.oauth.firs.post({ email, password, mock }),

    putFirsCredentials: (tenantId: string, certificate: string, publicKey: string) =>
      api.v1.tenants({ tenantId })['firs-credentials'].put({ certificate, publicKey }),

    getOnboarding: (tenantId: string) =>
      api.v1.tenants({ tenantId }).onboarding.get(),

    generateWebhook: (tenantId: string, invoiceIdKey?: string) =>
      api.v1.tenants({ tenantId }).webhook.generate.post({ ...(invoiceIdKey ? { invoiceIdKey } : {}) }),

    updateInvoiceIdKey: (tenantId: string, invoiceIdKey: string) =>
      api.v1.tenants({ tenantId })['invoice-id-key'].put({ invoiceIdKey }),

    updatePaymentStatus: (irn: string, data: {
      status: string;
      paymentDate?: string;
      paymentAmount?: number;
      paymentReference?: string;
    }) =>
      (api as any).v1.invoicing({ irn }).status.patch(data),

    testWebhook: (tenantId: string, testPayload?: Record<string, unknown>) =>
      api.v1.tenants({ tenantId }).webhook.test.post({ testPayload: testPayload || {} }),

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
