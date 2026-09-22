export type InvoiceKeyType =
  | 'standard_invoice'
  | 'credit_note'
  | 'debit_note'
  | 'payment'
  | 'invoice_updated'
  | 'invoice_voided'
  | 'invoice_canceled';

export interface KeyConfigEntry {
  keyType: InvoiceKeyType;
  name?: string;
  eventType?: string;
  idKey: string;
  referenceIdKey?: string;
}
