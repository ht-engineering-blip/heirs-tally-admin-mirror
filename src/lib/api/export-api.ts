import type { ExportJobSummary, ExportRequestBody, ExportResourceDescriptor } from '@/types/monitoring'
import { toast } from 'sonner'

async function proxyFetch<T>(basePath: string, path: string, params?: Record<string, any>): Promise<T> {
  const url = new URL(`${window.location.origin}${basePath}${path}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value != null && value !== '') url.searchParams.set(key, String(value))
    })
  }

  const res = await fetch(url.toString(), { credentials: 'include' })
  const json = await res.json().catch(() => ({}))

  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || json?.message || 'Request failed')
  }

  return json
}

async function postProxyFetch<T>(basePath: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${window.location.origin}${basePath}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))

  if (!res.ok || json?.success === false) {
    throw new Error(json?.error || json?.message || 'Request failed')
  }

  return json
}

/** Builds the full export job flow, scoped to whichever proxy (admin or
 * tenant) the caller authenticates through — the generic /export/* routes
 * live outside both proxies' own prefix but are forwarded through either
 * one unchanged. */
export function createExportFlow(basePath: string) {
  return {
    /** The generic queue endpoint — lets the caller choose exactly which
     * columns to include, via the ExportDialog column picker. */
    queueExport: (body: ExportRequestBody) =>
      postProxyFetch<{ success: true; data: ExportJobSummary }>(basePath, '/v1/export/', body),

    /** Lists every exportable resource with its full column catalog — what
     * the ExportDialog's column picker renders. */
    listResources: () =>
      proxyFetch<{ success: true; data: ExportResourceDescriptor[] }>(basePath, '/v1/export/resources'),

    /** Recent export jobs (admins see all, tenants see their own) — backs
     * the ExportDialog's "Recent exports" tab. */
    listJobs: (limit = 20) =>
      proxyFetch<{ success: true; data: ExportJobSummary[] }>(basePath, '/v1/export/jobs', { limit }),

    getJob: (exportId: string) =>
      proxyFetch<{ success: true; data: ExportJobSummary }>(basePath, `/v1/export/jobs/${exportId}`),

    download: async (exportId: string): Promise<Blob> => {
      const res = await fetch(`${window.location.origin}${basePath}/v1/export/jobs/${exportId}/download`, {
        credentials: 'include',
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || 'Failed to download export')
      }
      return res.blob()
    },
  }
}

export type ExportFlow = ReturnType<typeof createExportFlow>

/** Maps known infrastructure error signatures (IAM/S3 access denials, raw
 * AWS ARNs, or any other unbroken technical string) to plain language a
 * non-technical user can act on — the export worker surfaces these as-is
 * from AWS, and they're meaningless without that context. Anything else
 * (a normal, readable backend message) passes through unchanged. The raw
 * message is never lost — callers that want it for support/debugging
 * purposes keep their own reference to the original (e.g. a tooltip). */
export function humanizeExportError(message: string | null | undefined): string {
  const fallback = 'Something went wrong while generating this export. Please try again, or contact support if this keeps happening.'
  if (!message) return fallback
  if (/is not authorized to perform|AccessDenied|identity-based policy/i.test(message)) {
    return "This export couldn't be saved due to a backend configuration issue. Our team has been notified — please try again shortly, or contact support if it persists."
  }
  if (/arn:aws|NoSuchBucket|RequestTimeout|s3:\/\//i.test(message)) {
    return 'A storage error occurred while generating this export. Please try again, or contact support if this keeps happening.'
  }
  // Long and/or space-free text reads as a stack trace or raw system
  // output rather than a sentence meant for a user.
  if (message.length > 160 || !/\s/.test(message)) return fallback
  return message
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

/** Re-downloads an already-completed job — used by the ExportDialog's
 * "Recent exports" tab, where the job was queued and finished in an earlier
 * session and there's nothing left to poll. */
export async function downloadCompletedJob(flow: ExportFlow, job: ExportJobSummary): Promise<void> {
  if (job.status !== 'completed') {
    throw new Error('This export hasn\'t finished yet')
  }
  const blob = await flow.download(job.exportId)
  triggerBlobDownload(blob, job.fileName || `${job.resource}.csv`)
}

/** Default export window for tables with no date filter of their own —
 * last 90 days ending now. The backend's export routes require from/to. */
export function defaultExportRange(): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 90)
  return { from: from.toISOString(), to: to.toISOString() }
}

// A stuck job (e.g. the backend worker erroring before it ever flips the
// job to "failed") would otherwise poll forever — 3 minutes comfortably
// covers a real export; past that, something upstream needs attention.
const DEFAULT_POLL_TIMEOUT_MS = 3 * 60 * 1000

/** Polls a queued export job until it completes or fails, then triggers the
 * browser download — the client-side half of the queue → poll → download
 * flow the backend's async export jobs require. */
export async function pollAndDownloadExport(
  flow: ExportFlow,
  exportId: string,
  opts?: { intervalMs?: number; timeoutMs?: number; onStatus?: (job: ExportJobSummary) => void }
): Promise<ExportJobSummary> {
  const intervalMs = opts?.intervalMs ?? 1500
  const deadline = Date.now() + (opts?.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS)

  for (;;) {
    const { data: job } = await flow.getJob(exportId)
    opts?.onStatus?.(job)

    if (job.status === 'failed') {
      throw new Error(humanizeExportError(job.error))
    }
    if (job.status === 'completed' && job.downloadUrl) {
      const blob = await flow.download(exportId)
      triggerBlobDownload(blob, job.fileName || `${job.resource}.csv`)
      return job
    }

    if (Date.now() > deadline) {
      throw new Error('This export is taking longer than expected. It may still finish in the background — try again in a bit.')
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

/** Runs the queue-already-done → poll → download flow with toast progress
 * feedback on a single, updating toast — replacing the separate
 * info/success/error toast calls every export button used to repeat.
 * Swallows and reports its own errors (via the toast) rather than
 * rethrowing, so callers only need to catch failures from queuing. */
export async function exportWithToast(
  flow: ExportFlow,
  exportId: string,
  opts?: { label?: string }
): Promise<void> {
  const label = opts?.label ?? 'export'
  const toastId = `export-${exportId}`
  toast.loading(`Preparing your ${label}…`, { id: toastId })

  try {
    const job = await pollAndDownloadExport(flow, exportId, {
      onStatus: (status) => {
        if (status.status === 'processing') {
          toast.loading(`Generating your ${label}…`, { id: toastId })
        }
      },
    })
    const rows = job.rowCount === 1 ? '1 row' : `${job.rowCount.toLocaleString()} rows`
    toast.success(`Export ready — ${rows} downloaded`, { id: toastId })
  } catch (error: any) {
    // pollAndDownloadExport already humanizes a 'failed' job's error; this
    // fallback only covers network/unexpected failures that bypassed that.
    toast.error(error?.message || `Failed to generate your ${label}`, { id: toastId })
  }
}
