'use client';

import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ArrayMapping, FieldMapping } from '@/types/mapping';

/** Read-only mapping summary — no field pickers, no remove/clear actions, just the mappings already saved (with transform/required badges when present) plus an array-mappings summary. */
export function ReadOnlyMappingsList({
  mappingData,
  arrayMappings,
}: {
  mappingData: FieldMapping[];
  arrayMappings: ArrayMapping[];
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Field Mappings ({mappingData.length})</CardTitle>
          <CardDescription>Source fields mapped to NRS target fields</CardDescription>
        </CardHeader>
        <CardContent>
          {mappingData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No field mappings configured.</p>
          ) : (
            // A fixed height is required for Radix ScrollArea to actually
            // clip/scroll (max-height alone doesn't, since its Viewport's
            // height:100% can't resolve against an auto-height parent) —
            // but only wrap in one once there's enough rows to need it, so
            // short lists don't get stuck with empty space below them.
            (() => {
              const rows = (
                <div className="space-y-1">
                  {mappingData.map((mapping, idx) => (
                    <div
                      key={`${mapping.source}-${mapping.target}-${idx}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/30 text-sm"
                    >
                      <code className="text-xs font-mono text-primary flex-1 truncate">{mapping.source}</code>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      <code className="text-xs font-mono text-success flex-1 truncate">{mapping.target}</code>
                      {mapping.required && (
                        <Badge className="bg-destructive/10 text-destructive text-[10px] shrink-0">Required</Badge>
                      )}
                      {mapping.transform && <Badge variant="outline" className="text-[10px] shrink-0">{mapping.transform}</Badge>}
                    </div>
                  ))}
                </div>
              );
              return mappingData.length > 10 ? <ScrollArea className="h-[500px]">{rows}</ScrollArea> : rows;
            })()
          )}
        </CardContent>
      </Card>

      {arrayMappings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Array Mappings ({arrayMappings.length})</CardTitle>
            <CardDescription>Repeating structures mapped separately from top-level fields</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {arrayMappings.map((am, arrIdx) => (
              <div key={`${am.source_array_path}-${arrIdx}`} className="rounded-md bg-muted/30 p-3 space-y-1">
                <div className="flex items-center gap-3 text-sm">
                  <code className="text-xs font-mono text-primary">{am.source_array_path}</code>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  <code className="text-xs font-mono text-success">{am.target_array_path}</code>
                  <Badge variant="secondary" className="text-[10px]">{am.item_mappings.length} item mappings</Badge>
                </div>
                {am.item_mappings.map((m, itemIdx) => (
                  <div key={`${m.source}-${m.target}-${itemIdx}`} className="flex items-center gap-3 pl-6 text-xs text-muted-foreground">
                    <code className="font-mono">{m.source}</code>
                    <ChevronRight className="w-3 h-3 shrink-0" />
                    <code className="font-mono">{m.target}</code>
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
