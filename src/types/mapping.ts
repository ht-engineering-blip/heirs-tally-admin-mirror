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

export interface NrsSchema {
  version: string;
  name: string;
  required_fields: string[];
  required_item_fields: string[];
}

export interface MappingTestResult {
  valid: boolean;
  transformed_invoice: Record<string, any>;
  validation_errors: string[];
  execution_time_ms: number;
}

export interface MappingSaveResult {
  schema_id: string;
  erp_source: string;
  status: string;
  message: string;
}
