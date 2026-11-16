import type { ExportJobSummary } from '@/types/monitoring'

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

/** Builds the queue/status/download trio for the shared async-export job
 * flow, scoped to whichever proxy (admin or tenant) the caller authenticates
 * through — the generic /export/jobs/:exportId routes live outside both
 * proxies' own prefix but are forwarded through either one unchanged. */
export function createExportFlow(basePath: string) {
  return {
    queue: (queuePath: string, filters: Record<string, any>) =>
      proxyFetch<{ success: true; data: ExportJobSummary }>(basePath, queuePath, filters),

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

/** Default export window for tables with no date filter of their own —
 * last 90 days ending now. The backend's export routes require from/to. */
export function defaultExportRange(): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 90)
  return { from: from.toISOString(), to: to.toISOString() }
}

/** Polls a queued export job until it completes or fails, then triggers the
 * browser download — the client-side half of the queue → poll → download
 * flow the backend's async export jobs require. */
export async function pollAndDownloadExport(
  flow: ExportFlow,
  exportId: string,
  opts?: { intervalMs?: number; onStatus?: (job: ExportJobSummary) => void }
): Promise<ExportJobSummary> {
  const intervalMs = opts?.intervalMs ?? 1500

  for (;;) {
    const { data: job } = await flow.getJob(exportId)
    opts?.onStatus?.(job)

    if (job.status === 'failed') {
      throw new Error(job.error || 'Export failed')
    }
    if (job.status === 'completed' && job.downloadUrl) {
      const blob = await flow.download(exportId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = job.fileName || `${job.resource}.csv`
      a.click()
      URL.revokeObjectURL(url)
      return job
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}
