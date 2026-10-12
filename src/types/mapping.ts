export type TransformType =
  | 'toDate'
  | 'toTime'
  | 'toNumber'
  | 'toString'
  | 'trim'
  | 'uppercase'
  | 'lowercase'
  | 'sanitizePhone'
  | 'sanitizeHsn';

export interface FieldMapping {
  source: string;
  target: string;
  fallback_sources?: string[];
  default_value?: any;
  transform?: TransformType;
  required?: boolean;
}

export interface ArrayMapping {
  source_array_path: string;
  target_array_path: string;
  item_mappings: FieldMapping[];
}

export interface MappingTemplate {
  erp_source: string;
  nrs_schema_version: string;
  field_mappings: FieldMapping[];
  array_mappings: ArrayMapping[];
}

// A single dictionary-style entry from an NrsSchema's `fields` list. Array
// item fields are inlined here too, addressed via `[*]` path notation
// (e.g. "invoice_line[*].hsn_code") rather than a separate list.
export interface NrsSchemaField {
  field_id: string;
  field_path: string;
  data_type: string;
  format?: string;
  validation_rules?: string;
  description?: string;
  example_value?: any;
  is_required: boolean;
  is_array?: boolean;
  enum_values?: any[];
  mapping_hints?: any[];
}

export interface NrsSchema {
  version: string;
  name: string;
  description?: string;
  isLatest?: boolean;
  fields: NrsSchemaField[];
}

// Mirrors the backend's DeterministicTransformResult (transform.routes.ts,
// mapping-spec.types.ts) — returned flat on data.data from POST /mapping/test.
export interface MappingTestResult {
  success: boolean;
  data?: Record<string, any>;
  errors?: string[];
  appliedRulesCount: number;
  healedFields: string[];
  missingRequiredFields?: string[];
  executionTimeMs: number;
}

export interface MappingSaveResult {
  schema_id: string;
  erp_source: string;
  status: string;
  message: string;
}

// Returned by GET /workflow/transform/mapping/:erp (single type) and, as
// array entries under data.mappings, by GET /workflow/transform/mapping/:erp/all
// (all MAPPING_DOCUMENT_TYPES in one call) — tenant-scoped when called with
// tenant auth.
export interface GetMappingResult {
  schema_id: string;
  name: string;
  erp_source: string;
  // Which document shape this template applies to (e.g. "STANDARD_INVOICE",
  // "CREDIT_NOTE") — null/absent means the legacy untyped template. A tenant
  // can hold a distinct saved template per document type for the same ERP.
  document_type?: string | null;
  // Only present on /all entries — true if this document type has a saved
  // template (own or platform default); false means no template fields are
  // included at all for that entry, not even a fallback.
  configured?: boolean;
  tenant_id: string | null;
  status: 'active' | 'draft' | 'deprecated' | 'archived';
  // true = the tenant's own saved override; false = the platform default.
  is_custom: boolean;
  template: MappingTemplate;
  created_at?: string;
  updated_at?: string;
  // NOT returned by the backend despite being persisted at save time
  // (confirmed against the live contract) — kept optional here only so the
  // local save-time cache update in erp-mapping/page.tsx can still carry it.
  sample_invoice?: Record<string, any>;
}

/** One selectable field in ConnectMapper's source/target lists. */
export interface PickerField {
  key: string;
  type?: string;
  required?: boolean;
}

/** One row in ValidationIssuesTable — a field-level or general validation failure. */
export interface ValidationIssue {
  field?: string;
  message: string;
}
