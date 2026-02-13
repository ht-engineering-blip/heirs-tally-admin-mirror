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
