export interface FriendlyError {
  /** Plain-language summary shown as the primary message */
  headline: string;
  /** Optional extra context shown under the headline (e.g. an ERP's own error body) */
  detail?: string;
  /** The original, unmodified message — always preserved for a "technical details" toggle */
  raw: string;
}

const ACTION_LABELS: Record<string, string> = {
  complete_outbound: 'Finalizing this invoice',
  complete_credit_note: 'Finalizing this credit note',
  complete_inbound: 'Processing this invoice',
  sync_erp: 'Syncing with your ERP',
  validate: 'Validating this invoice',
  transform: 'Transforming this invoice',
  sign: 'Signing this invoice',
  transmit: 'Transmitting this invoice',
};

function actionLabel(action?: string): string {
  if (!action || action === 'undefined') return 'This invoice';
  return ACTION_LABELS[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// NRS's raw validation messages follow a consistent, noisy shape, e.g.:
// "validation failed: we are unable to process your request. also confirm
// this is not a duplicate request - invoicerequest.invoice.invoiceline[0]
// .service_category is required when isic_code is provided"
// The useful part is only ever after the last " - ".
const NRS_VALIDATION_PATTERN = /unable to process your request.*duplicate request\s*-\s*(.+)$/i;

// Turns "invoicerequest.invoice.invoiceline[0].service_category" into
// "Invoice Line 1 → Service Category" — the dotted/bracketed field path NRS
// returns is technically accurate but meaningless to a non-technical reader.
function humanizeFieldPath(path: string): string {
  return path
    .split('.')
    .filter((seg) => seg && seg.toLowerCase() !== 'invoicerequest')
    .map((seg) => {
      const m = seg.match(/^(\w+)\[(\d+)\]$/);
      const name = (m ? m[1] : seg).replace(/_/g, ' ');
      const idx = m ? ` ${Number(m[2]) + 1}` : '';
      return name.replace(/\b\w/g, (c) => c.toUpperCase()) + idx;
    })
    .join(' → ');
}

// NRS's bare "is required" reason reads as a sentence fragment on its own —
// spell out that the field is actually missing. Conditional variants
// ("is required when X is provided") already carry enough context as-is.
function expandReason(reason: string): string {
  const trimmed = reason.trim();
  if (/^is required\.?$/i.test(trimmed)) return 'is required and is missing';
  return trimmed;
}

// ERP sync failures carry an HTTP status plus a body that's sometimes JSON,
// sometimes a raw HTML error page (nginx gateway errors), sometimes plain text.
function describeErpSyncFailure(raw: string): FriendlyError | null {
  const m = raw.match(/^ERP sync request failed:\s*(\d{3})\s*([^—]+)(?:—\s*([\s\S]*))?$/);
  if (!m) return null;
  const status = Number(m[1]);
  const bodyRaw = (m[3] || '').trim();

  let bodyMessage: string | undefined;
  if (bodyRaw.startsWith('{')) {
    try {
      const parsed = JSON.parse(bodyRaw);
      bodyMessage = parsed?.error?.message || parsed?.message || undefined;
    } catch {
      // not valid JSON after all — fall through with no extracted detail
    }
  } else if (bodyRaw && !bodyRaw.startsWith('<')) {
    bodyMessage = bodyRaw;
  }

  let headline: string;
  if (status === 401 || status === 403) {
    headline = "Your ERP rejected the connection — its API credentials may need attention.";
  } else if (status === 404) {
    headline = "The ERP couldn't find this invoice on its end.";
  } else if (status >= 500) {
    headline = 'The ERP system is temporarily unreachable. This usually resolves on its own — try resending shortly.';
  } else {
    headline = 'The ERP sync failed.';
  }

  return { headline, detail: bodyMessage, raw };
}

// A handful of specific, known-common raw messages that don't fit any
// pattern above but are frequent enough to deserve their own wording.
const KNOWN_MESSAGES: Record<string, string> = {
  'Failed to upsert outbound invoice':
    "This invoice couldn't be saved due to a temporary system issue. Try resending it — if it keeps happening, contact support.",
  'The operation was aborted.': 'This step took too long and was cancelled. Please try again.',
};

function describeRawErrorText(raw: string, action?: string): FriendlyError {
  if (!raw) {
    return { headline: 'An unexpected error occurred. Please try again.', raw: '' };
  }

  const known = KNOWN_MESSAGES[raw.trim()];
  if (known) return { headline: known, raw };

  const nrsMatch = raw.match(NRS_VALIDATION_PATTERN);
  if (nrsMatch) {
    const tail = nrsMatch[1].trim();
    const pathMatch = tail.match(/^([\w.[\]]+)\s+(.*)$/);
    if (pathMatch) {
      return { headline: `NRS rejected this invoice: "${humanizeFieldPath(pathMatch[1])}" ${expandReason(pathMatch[2])}`, raw };
    }
    return { headline: `NRS rejected this invoice: ${expandReason(tail)}`, raw };
  }

  if (raw.startsWith('ERP sync request failed')) {
    const described = describeErpSyncFailure(raw);
    if (described) return described;
  }

  // Looks like a raw JS/runtime error leaking through from the backend —
  // never show these verbatim, they're meaningless (and alarming) to a user.
  if (/is not a (object|function|defined)|undefined is not|cannot read propert/i.test(raw)) {
    return {
      headline: `${actionLabel(action)} hit an unexpected internal error. Our team has been notified — contact support if this persists.`,
      raw,
    };
  }

  // Unrecognized shape — still surface it (it may be genuinely informative),
  // just framed with what step of the process it happened in.
  return { headline: `${actionLabel(action)} failed: ${raw}`, raw };
}

export function humanizeInvoiceError(
  err: { action?: string; error?: string } | null | undefined,
): FriendlyError {
  const raw = err?.error && err.error !== 'undefined' ? err.error : '';
  return describeRawErrorText(raw, err?.action);
}

export function humanizeValidationErrorEntry(err: any): FriendlyError {
  const raw =
    typeof err === 'string' ? err : err?.message || err?.error || JSON.stringify(err);
  return describeRawErrorText(raw);
}
