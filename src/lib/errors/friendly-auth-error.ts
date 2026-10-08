import type { FriendlyError } from './friendly-invoice-error';

// NRS/FIRS auth failures come back from the backend as the raw upstream
// response stringified into the error message, e.g.:
// HTTP 401: {"code":401,"data":{"id":"...","status":"401 Unauthorized",
// "message":"Invalid login Credentials.","received_at":"...","entity_id":""}}
// The only part worth showing a user is the inner data.message.
const HTTP_JSON_PATTERN = /^HTTP\s+(\d{3}):\s*(\{[\s\S]*\})$/;

const STATUS_PREFIX: Record<number, string> = {
  401: 'NRS rejected your login',
  403: "Your NRS account doesn't have permission for this",
  404: "NRS couldn't find an account with these details",
};

export function humanizeNrsAuthError(raw: string | null | undefined): FriendlyError {
  if (!raw) {
    return { headline: 'Failed to authenticate with NRS. Please try again.', raw: raw || '' };
  }

  const match = raw.match(HTTP_JSON_PATTERN);
  if (match) {
    const status = Number(match[1]);
    let parsed: any = null;
    try {
      parsed = JSON.parse(match[2]);
    } catch {
      // not valid JSON after all — fall through to the generic framing below
    }
    const innerMessage: string | undefined = parsed?.data?.message || parsed?.message;
    const prefix =
      STATUS_PREFIX[status] ||
      (status >= 500 ? "NRS's portal is temporarily unavailable" : 'NRS rejected this request');
    const headline = innerMessage ? `${prefix} — ${innerMessage.replace(/\.+$/, '')}.` : `${prefix}.`;
    return { headline, raw };
  }

  // A raw JS/runtime error leaking through from the backend — never show
  // these verbatim, they're meaningless (and alarming) to a user.
  if (/is not a (object|function|defined)|undefined is not|cannot read propert/i.test(raw)) {
    return {
      headline: 'NRS authentication hit an unexpected internal error. Contact support if this persists.',
      raw,
    };
  }

  return { headline: raw, raw };
}
