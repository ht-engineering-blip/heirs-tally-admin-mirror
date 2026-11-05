// Mirrors docs/platform-admin-and-monitoring-api-contract.md — field names
// and nullability are taken directly from that contract, not inferred.

export type FailureCategory =
  | 'schema_validation'
  | 'mapping_configuration'
  | 'business_rule'
  | 'nrs_rejection'
  | 'transport_timeout'
  | 'auth_credential'
  | 'unknown'

// The NRS numeric invoice-type code used as the `documentType` filter/value
// everywhere in monitoring — NOT the "STANDARD_INVOICE"/"CREDIT_NOTE" mapping
// vocabulary used by `documentTypeConfiguration` below. See the warning in
// §3.1 of the contract doc before wiring these two together.
export type NrsDocumentTypeCode = '380' | '381' | '384' | '385' | '388' | '389'

export const NRS_DOCUMENT_TYPE_LABELS: Record<NrsDocumentTypeCode, string> = {
  '380': 'Credit Note',
  '381': 'Commercial Invoice',
  '384': 'Debit Note',
  '385': 'Self Billed Invoice',
  '388': 'Factored Invoice',
  '389': 'Statement of Account',
}

export interface MonitoringFunnel {
  transmitted: number
  validated: number
  /** Current open-failure gauge, not scoped to the period filter. */
  failed: number
  rectified: number
  retries: number
}

export interface MonitoringFilters {
  from?: string
  to?: string
  tenantId?: string
  erpSystem?: string
  documentType?: NrsDocumentTypeCode | string
  failureCategory?: FailureCategory
}

export interface MonitoringOverview {
  period: { from: string; to: string }
  filters: {
    tenantId: string | null
    erpSystem: string | null
    documentType: string | null
    failureCategory: string | null
  }
  funnel: MonitoringFunnel
  topFailureReasons: Array<{ category: string; count: number }>
  /** Current open failures per tenant, not period-scoped. */
  tenantLeaderboard: Array<{ tenantId: string; openFailures: number }>
  documentTypes: Array<{ documentType: string; count: number }>
  dailyTrend: Array<{ date: string; transmitted: number; validated: number; failed: number }>
  retries: {
    invoiceValidationAttempts: number
    webhookDeliveryRetries: number
  }
  dataCoverage: {
    aggregation: string
    transmitted: string
    validated: string
    failed: string
    rectified: string
    retries: string
    environment: string
  }
}

export type DocumentTypeConfigValue =
  | 'STANDARD_INVOICE'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'SELF_BILLED_INVOICE'
  | 'FACTORED_INVOICE'
  | 'STATEMENT_OF_ACCOUNT'

export interface MonitoringCompany {
  company: {
    tenantId: string
    businessName: string
    erpSystem: string | null
    status: string
    createdAt: string
  }
  period: { from: string; to: string }
  funnel: MonitoringFunnel
  failureReasons: Array<{ category: string; count: number }>
  // Always all 6 document types, one row each — different vocabulary from
  // the `documentType` query filter, never feed these back into it.
  documentTypeConfiguration: Array<{
    documentType: DocumentTypeConfigValue
    configured: boolean
    source: 'tenant' | 'default' | 'missing'
    status: 'active' | 'draft' | 'deprecated' | 'archived' | null
  }>
  dailyTrend: Array<{ date: string; transmitted: number; validated: number; failed: number }>
  onboardingToFirstSuccess: {
    firstTransmittedAt: string | null
    firstSuccessAt: string | null
    timeToFirstSuccessMilliseconds: number | null
  }
  timeToResolution: { available: false; reason: string }
  dataCoverage: { eventTimeline: string; mappingState: string; environment: string }
}

export interface MonitoringFailureRow {
  irn: string
  tenantId: string
  erpSystem: string
  status: string
  invoiceNumber?: string
  /** invoice_type_code, if present — see NrsDocumentTypeCode. */
  documentType?: string
  failureCategory: string
  reason?: string
  failedAt?: string
  retryCount: number
  validationAttempts?: number
  resolutionStatus: 'open' | 'rectified'
  timeToResolutionMilliseconds: number | null
  createdAt: string
  updatedAt: string
  detailUrl: string
}

export interface MonitoringFailuresResponse {
  success: true
  data: MonitoringFailureRow[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  meta: {
    total: number
    page: number
    limit: number
    pages: number
    period: { from: string; to: string }
    filters: {
      tenantId: string | null
      erpSystem: string | null
      documentType: string | null
      failureCategory: string | null
    }
  }
}

export interface MonitoringHealth {
  period: { from: string; to: string }
  api: Array<{
    route: string
    requestCount: number
    errorCount: number
    clientErrorCount: number
    serverErrorCount: number
    timeoutCount: null
    errorRate: number
    p50Seconds: number | null
    p95Seconds: number | null
    p99Seconds: number | null
  }>
  pipeline: Array<{
    step: string
    erpSystem: string
    successCount: number
    failureCount: number
    failureRate: number
    p50Seconds: number | null
    p95Seconds: number | null
    p99Seconds: number | null
  }>
  webhooks: {
    total: number
    delivered: number
    failed: number
    retrying: number
    deliverySuccessRate: number
    totalAttempts: number
  }
  backlog: {
    processing: number
    oldestInFlightAt: string | null
  }
  retryEffectiveness: { available: false; reason: string }
  dataCoverage: {
    apiMetrics: string
    pipelineMetrics: string
    queueDepth: string
    webhookMetrics: string
    endpointDirection: string
  }
}

export interface MonitoringAlert {
  key: 'tenant_failure_rate' | 'cross_tenant_failure_spike' | 'open_failure_age' | 'api_error_rate' | 'api_p95_latency'
  severity: 'warning' | 'critical'
  message: string
  tenantId?: string
  observedValue: number
  threshold: number
}

export interface MonitoringAlertsResponse {
  alerts: MonitoringAlert[]
  thresholds: {
    failureRatePercent: number
    openFailureHours: number
    apiErrorRatePercent: number | null
    apiP95Milliseconds: number | null
    crossTenantFailureCount: number
    source: string
    delivery: string
  }
}
