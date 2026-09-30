import type { ValidationIssue } from '@/types/mapping';

/** Two-column Field/Issue table for structured validation failures (a rejected request body, or the mapping gatekeeper's per-field errors). */
export function ValidationIssuesTable({ issues }: { issues: ValidationIssue[] }) {
  return (
    <div className="border rounded-md overflow-hidden mt-2">
      <div className="max-h-[280px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium w-2/5">Field</th>
              <th className="px-3 py-2 font-medium">Issue</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue, idx) => (
              <tr key={idx} className="border-t border-border/50">
                <td className="px-3 py-2 align-top">
                  {issue.field ? (
                    <code className="text-xs font-mono break-all">{issue.field}</code>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 align-top text-muted-foreground">{issue.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Single-column bordered list for plain message strings (no field data to split out) — e.g. the deterministic transform's own errors/missing fields. */
export function IssuesList({ items }: { items: string[] }) {
  return (
    <div className="border rounded-md overflow-hidden mt-2">
      <div className="max-h-[240px] overflow-y-auto divide-y divide-border/50">
        {items.map((item, idx) => (
          <div key={idx} className="px-3 py-2 text-sm flex items-start gap-2">
            <span className="text-muted-foreground shrink-0">•</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
