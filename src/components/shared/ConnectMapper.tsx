'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileJson, Plus, Server, Unlink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { FieldMapping, PickerField } from '@/types/mapping';

/** Reusable click-to-connect source/target picker — used for both the top-level field mapper and each array mapping's nested item mapper. */
export function ConnectMapper({
  sourceFields,
  targetFields,
  mappings,
  onConnect,
  onRemoveBySource,
  onRemoveByTarget,
  sourceLabel,
  targetLabel,
  onAddCustomTarget,
}: {
  sourceFields: PickerField[];
  targetFields: PickerField[];
  mappings: FieldMapping[];
  onConnect: (source: string, target: string) => void;
  onRemoveBySource: (source: string) => void;
  onRemoveByTarget: (target: string) => void;
  sourceLabel: string;
  targetLabel: string;
  onAddCustomTarget?: (path: string) => void;
}) {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [sourceSearch, setSourceSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [customTarget, setCustomTarget] = useState('');

  const filteredSource = useMemo(() => {
    if (!sourceSearch) return sourceFields;
    const q = sourceSearch.toLowerCase();
    return sourceFields.filter((f) => f.key.toLowerCase().includes(q));
  }, [sourceSearch, sourceFields]);

  const filteredTarget = useMemo(() => {
    if (!targetSearch) return targetFields;
    const q = targetSearch.toLowerCase();
    return targetFields.filter((f) => f.key.toLowerCase().includes(q));
  }, [targetSearch, targetFields]);

  const getForSource = (key: string) => mappings.filter((m) => m.source === key);
  const getForTarget = (key: string) => mappings.filter((m) => m.target === key);

  useEffect(() => {
    if (selectedSource && selectedTarget) {
      onConnect(selectedSource, selectedTarget);
      setSelectedSource(null);
      setSelectedTarget(null);
    }
  }, [selectedSource, selectedTarget]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Server className="w-4 h-4" />
            {sourceLabel}
          </CardTitle>
          <Input
            placeholder="Search..."
            value={sourceSearch}
            onChange={(e) => setSourceSearch(e.target.value)}
            className="mt-2 h-8"
          />
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[320px]">
            <div className="space-y-0.5 p-3">
              {filteredSource.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No fields available</p>
              )}
              {filteredSource.map((field) => {
                const mapped = getForSource(field.key);
                const isMapped = mapped.length > 0;
                const isSelected = selectedSource === field.key;
                return (
                  <div
                    key={field.key}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors text-sm group',
                      isSelected && 'bg-primary/10 border border-primary/30',
                      isMapped && !isSelected && 'bg-success/5 border border-success/20',
                      !isMapped && !isSelected && 'hover:bg-muted/50 border border-transparent'
                    )}
                    onClick={() => setSelectedSource(isSelected ? null : field.key)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <code className="text-xs font-mono truncate">{field.key}</code>
                      {field.type && <Badge variant="outline" className="text-[10px] shrink-0">{field.type}</Badge>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isMapped && <Badge variant="secondary" className="text-[10px]">{mapped.length}</Badge>}
                      {isMapped && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveBySource(field.key);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 rounded"
                          title="Remove mapping"
                        >
                          <Unlink className="w-3 h-3 text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileJson className="w-4 h-4" />
            {targetLabel}
          </CardTitle>
          <Input
            placeholder="Search..."
            value={targetSearch}
            onChange={(e) => setTargetSearch(e.target.value)}
            className="mt-2 h-8"
          />
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[320px]">
            <div className="space-y-0.5 p-3">
              {filteredTarget.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No fields available</p>
              )}
              {filteredTarget.map((field) => {
                const mapped = getForTarget(field.key);
                const isMapped = mapped.length > 0;
                const isSelected = selectedTarget === field.key;
                return (
                  <div
                    key={field.key}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors text-sm group',
                      isSelected && 'bg-primary/10 border border-primary/30',
                      isMapped && !isSelected && 'bg-success/5 border border-success/20',
                      !isMapped && !isSelected && 'hover:bg-muted/50 border border-transparent'
                    )}
                    onClick={() => setSelectedTarget(isSelected ? null : field.key)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <code className="text-xs font-mono truncate">{field.key}</code>
                      {field.required && (
                        <Badge className="bg-destructive/10 text-destructive text-[10px] shrink-0">Required</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isMapped && <Badge variant="secondary" className="text-[10px]">{mapped.length}</Badge>}
                      {isMapped && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveByTarget(field.key);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 rounded"
                          title="Remove mapping"
                        >
                          <Unlink className="w-3 h-3 text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
        {onAddCustomTarget && (
          <div className="flex items-center gap-2 p-3 border-t">
            <Input
              placeholder="Add custom target path..."
              value={customTarget}
              onChange={(e) => setCustomTarget(e.target.value)}
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 shrink-0"
              disabled={!customTarget.trim()}
              onClick={() => {
                onAddCustomTarget(customTarget.trim());
                setCustomTarget('');
              }}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
