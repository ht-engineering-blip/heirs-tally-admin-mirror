'use client';

import { useState } from 'react';
import { Braces, ChevronDown, ChevronRight, Plus, Unlink, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { PLACEHOLDER_TOKENS, TRANSFORM_OPTIONS } from '@/lib/erp-mapping/helpers';
import type { FieldMapping, TransformType } from '@/types/mapping';

/** Inserts a backend placeholder token (e.g. {{SUPPLIER_TIN}}) into the Default Value field — the backend fills these in per-tenant at transform time, no lookup needed here. */
function PlaceholderTokenPicker({ onInsert }: { onInsert: (token: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" title="Insert placeholder token">
          <Braces className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-2 border-b">
          <p className="text-xs font-medium">Placeholder tokens</p>
          <p className="text-[11px] text-muted-foreground">Filled in per-tenant at transform time</p>
        </div>
        <div className="max-h-[280px] overflow-y-auto p-1">
          {PLACEHOLDER_TOKENS.map((t) => (
            <button
              key={t.token}
              type="button"
              className="w-full text-left px-2 py-1.5 rounded hover:bg-muted/70 transition-colors"
              onClick={() => {
                onInsert(t.token);
                setOpen(false);
              }}
            >
              <code className="text-xs font-mono text-primary">{t.token}</code>
              <p className="text-[11px] text-muted-foreground">{t.description}</p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Expandable row for one field mapping — reveals transform, fallback sources, and default value controls, reused for both top-level and per-array item mappings. */
export function MappingRow({
  mapping,
  onRemove,
  onChange,
}: {
  mapping: FieldMapping;
  onRemove: () => void;
  onChange: (patch: Partial<FieldMapping>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newFallback, setNewFallback] = useState('');

  const defaultValueStr =
    mapping.default_value !== undefined && mapping.default_value !== null ? String(mapping.default_value) : '';

  return (
    <div className="rounded-md bg-muted/30">
      <div className="flex items-center gap-2 px-3 py-2 text-sm group">
        <button onClick={() => setExpanded((e) => !e)} className="p-0.5 hover:bg-muted rounded shrink-0">
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
        </button>
        <code className="text-xs font-mono text-primary flex-1 truncate">{mapping.source}</code>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        <code className="text-xs font-mono text-success flex-1 truncate">{mapping.target}</code>
        {mapping.required && (
          <Badge className="bg-destructive/10 text-destructive text-[10px] shrink-0">Required</Badge>
        )}
        {mapping.transform && <Badge variant="outline" className="text-[10px] shrink-0">{mapping.transform}</Badge>}
        <button
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded shrink-0"
          title="Remove mapping"
        >
          <Unlink className="w-3 h-3 text-destructive" />
        </button>
      </div>
      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Transform</Label>
              <Select
                value={mapping.transform || 'none'}
                onValueChange={(v) => onChange({ transform: v === 'none' ? undefined : (v as TransformType) })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSFORM_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Default Value</Label>
              <div className="flex items-center gap-2">
                <Input
                  className="h-8 text-xs"
                  placeholder="Used when source is empty"
                  value={defaultValueStr}
                  onChange={(e) => onChange({ default_value: e.target.value || undefined })}
                />
                <PlaceholderTokenPicker
                  onInsert={(token) => onChange({ default_value: `${defaultValueStr}${token}` })}
                />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fallback Sources</Label>
            {(mapping.fallback_sources || []).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {(mapping.fallback_sources || []).map((fb, i) => (
                  <Badge key={`${fb}-${i}`} variant="secondary" className="text-[10px] gap-1">
                    <code>{fb}</code>
                    <button
                      onClick={() =>
                        onChange({ fallback_sources: (mapping.fallback_sources || []).filter((_, idx) => idx !== i) })
                      }
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input
                className="h-8 text-xs"
                placeholder="Add fallback source path..."
                value={newFallback}
                onChange={(e) => setNewFallback(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 shrink-0"
                disabled={!newFallback.trim()}
                onClick={() => {
                  onChange({ fallback_sources: [...(mapping.fallback_sources || []), newFallback.trim()] });
                  setNewFallback('');
                }}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
