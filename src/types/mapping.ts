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
