import { getTenantApiClient } from './client'

export function createTenantApi() {
  const api = getTenantApiClient()

  return {
    login: (email: string, password: string) =>
      api.v1.auth.post({ email, password }),

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

    generateWebhook: (tenantId: string) =>
      api.v1.tenants({ tenantId }).webhook.generate.post({}),

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
      triggerEvents?: ('invoice.validated' | 'invoice.signed' | 'invoice.transmitted' | 'invoice.received' | 'invoice.acknowledged')[];
    }) =>
      api.v1.tenants({ tenantId })['erp-sync'].put(config),

    // Sandbox / Workflow endpoints
    sandboxTransform: (invoice: any, sourceType?: string) =>
      api.v1.workflow.transform.post({ invoice, source_type: sourceType }),

    sandboxOutbound: () =>
      api.v1.workflow.outbound.post({}),

    sandboxInbound: () =>
      api.v1.workflow.inbound.post({}),

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
    }) =>
      api.v1.tenants({ tenantId }).patch(data),
  }
}
