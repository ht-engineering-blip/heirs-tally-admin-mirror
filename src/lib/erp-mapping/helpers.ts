import type { NrsSchemaField, TransformType, ValidationIssue } from '@/types/mapping';

// The backend's `is_required` flag on NRS schema fields is currently
// unreliable (observed false even on fields whose validation_rules says
// "required"), so treat either signal as authoritative.
export function isFieldRequired(f: Pick<NrsSchemaField, 'is_required' | 'validation_rules'>): boolean {
  return !!f.is_required || /required/i.test(f.validation_rules || '');
}

/** Flatten a nested object into dot-notation paths, representing arrays with [*] notation */
export function flattenObject(obj: any, prefix = ''): { key: string; type: string }[] {
  const result: { key: string; type: string }[] = [];
  if (!obj || typeof obj !== 'object') return result;

  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === 'object') {
      result.push(...flattenObject(obj[0], `${prefix}[*]`));
    } else {
      result.push({ key: prefix || 'root', type: 'array' });
    }
    return result;
  }

  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      result.push(...flattenObject(v, fullKey));
    } else if (Array.isArray(v)) {
      if (v.length > 0 && typeof v[0] === 'object') {
        result.push(...flattenObject(v[0], `${fullKey}[*]`));
      } else {
        result.push({ key: fullKey, type: 'array' });
      }
    } else {
      result.push({ key: fullKey, type: typeof v });
    }
  }
  return result;
}

export const TRANSFORM_OPTIONS: { value: TransformType | 'none'; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'toDate', label: 'To Date' },
  { value: 'toTime', label: 'To Time' },
  { value: 'toNumber', label: 'To Number' },
  { value: 'toString', label: 'To String' },
  { value: 'trim', label: 'Trim' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'sanitizePhone', label: 'Sanitize Phone' },
  { value: 'sanitizeHsn', label: 'Sanitize HSN' },
];

/**
 * Placeholder tokens the backend auto-injects from the authenticated
 * tenant's profile at transform time — usable inside a FieldMapping's
 * default_value (or embedded in a string, e.g. "INV-{{IRN}}"). One entry
 * per concept; aliases are noted in the description rather than listed as
 * separate tokens. Empty string if the underlying profile field is unset —
 * never a fabricated value.
 */
export const PLACEHOLDER_TOKENS: { token: string; description: string }[] = [
  { token: '{{SUPPLIER_TIN}}', description: "Tenant TIN (alias: {{TIN}}, {{BUSINESS_TIN}})" },
  { token: '{{SUPPLIER_NAME}}', description: "Tenant business name (alias: {{BUSINESS_NAME}}, {{COMPANY_NAME}})" },
  { token: '{{SUPPLIER_EMAIL}}', description: "Tenant contact email (alias: {{BUSINESS_EMAIL}}, {{EMAIL}})" },
  { token: '{{SUPPLIER_PHONE}}', description: "Tenant phone (alias: {{PHONE}}, {{TELEPHONE}})" },
  { token: '{{SUPPLIER_STREET}}', description: 'Tenant postal address — street' },
  { token: '{{SUPPLIER_CITY}}', description: 'Tenant postal address — city' },
  { token: '{{SUPPLIER_STATE}}', description: 'Tenant postal address — state' },
  { token: '{{SUPPLIER_POSTAL_ZONE}}', description: 'Tenant postal address — postal/zip code' },
  { token: '{{SUPPLIER_COUNTRY}}', description: 'Tenant country, defaults "NG"' },
  { token: '{{SUPPLIER_BUSINESS_DESC}}', description: 'Tenant business description' },
  { token: '{{BUSINESS_ID}}', description: 'FIRS Business UUID' },
  { token: '{{IRN}}', description: 'Generated Invoice Reference Number' },
  { token: '{{ISSUE_DATE}}', description: 'Invoice issue date, or now' },
  { token: '{{ISSUE_TIME}}', description: 'Invoice issue time, or now' },
];

/** List dot-notation paths of every array-valued field in an object */
export function findArrayPaths(obj: any, prefix = ''): string[] {
  const paths: string[] = [];
  if (!obj || typeof obj !== 'object') return paths;
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) {
      paths.push(fullKey);
    } else if (v && typeof v === 'object') {
      paths.push(...findArrayPaths(v, fullKey));
    }
  }
  return paths;
}

export function resolvePath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc: any, seg) => (acc == null ? undefined : acc[seg]), obj);
}

// /mapping/save's 400 rejection can come from two different layers, both
// using `details`: Elysia's own request-body schema validation (before any
// business logic runs) sends `details: { on, message, fields: Record<fieldPath,
// message> }`; the mapping engine's own gatekeeper (confirmed shape) sends
// `details: [{ message }, ...]`. This is NOT the same shape as /mapping/test's
// failure response, which is a 200 with `errors: string[]` /
// `missingRequiredFields: string[]` inside `data` — never call this on that.
export function parseApiValidationErrors(errorValue: any): ValidationIssue[] {
  const fields = errorValue?.details?.fields;
  if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
    return Object.entries(fields).map(([field, message]) => ({ field, message: String(message) }));
  }
  if (Array.isArray(errorValue?.details)) {
    return errorValue.details
      .map((d: any) => (typeof d === 'string' ? { message: d } : d?.message ? { field: d.field, message: d.message } : null))
      .filter(Boolean);
  }
  return [];
}
