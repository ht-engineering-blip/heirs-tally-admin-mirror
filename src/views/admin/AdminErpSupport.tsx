'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileJson, Save, Loader2, Edit, Eye, Settings, Calendar, Clock, ArrowLeft, Server, Plus, Check,
  ChevronRight, ChevronLeft, Link2, Unlink, Sparkles, PenLine, PlayCircle, CheckCircle2, XCircle,
  ChevronDown, X, RefreshCw,
} from 'lucide-react';
import { getAdminApiClient } from '@/lib/api/client';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { extractJsonWithMetadata } from '@/lib/schema/firs-extractor';
import { DataTable, Column, FilterOption, StatusBadge } from '@/components/shared';
import { useSupportedErps, formatErpName } from '@/hooks/use-supported-erps';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type {
  FieldMapping,
  ArrayMapping,
  MappingTemplate,
  NrsSchema,
  MappingTestResult,
  TransformType,
} from '@/types/mapping';

interface ErpSupport {
  _id?: string;
  schema_id: string;
  name: string;
  description: string;
  source_type: string;
  erp_type: string;
  status: string;
  fields: any[];
  metadata: any;
  created_by?: string;
  mapping_rules?: any[];
  createdAt?: string;
  updatedAt?: string;
}

interface ErpListItem {
  id: string;
  status: string;
  source_type: string;
  last_updated: Date;
}

interface PickerField {
  key: string;
  type?: string;
  required?: boolean;
}

const TRANSFORM_OPTIONS: { value: TransformType | 'none'; label: string }[] = [
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

/** List dot-notation paths of every array-valued field in an object */
function findArrayPaths(obj: any, prefix = ''): string[] {
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

function resolvePath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc: any, seg) => (acc == null ? undefined : acc[seg]), obj);
}

/**
 * Schema Status
 */
export enum SchemaStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
  ARCHIVED = 'archived',
}

// Config steps
const CONFIG_STEPS = [
  { id: 'setup', label: 'Setup', description: 'ERP type & status' },
  { id: 'schema', label: 'Schema', description: 'Invoice & metadata' },
  { id: 'mapping', label: 'Field Mapping', description: 'Map to NRS schema' },
] as const;

type ConfigStep = typeof CONFIG_STEPS[number]['id'];

/** Flatten a nested object into dot-notation paths */
function flattenObject(obj: any, prefix = ''): { key: string; type: string }[] {
  const result: { key: string; type: string }[] = [];
  if (!obj || typeof obj !== 'object') return result;

  // Handle arrays - we represent them with [*] notation
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

// Reusable click-to-connect source/target picker — used for both the
// top-level field mapper and each array mapping's nested item mapper.
function ConnectMapper({
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

// Expandable row for one field mapping — reveals transform, fallback
// sources, and default value controls, reused for both top-level and
// per-array item mappings.
function MappingRow({
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
              <Input
                className="h-8 text-xs"
                placeholder="Used when source is empty"
                value={mapping.default_value !== undefined && mapping.default_value !== null ? String(mapping.default_value) : ''}
                onChange={(e) => onChange({ default_value: e.target.value || undefined })}
              />
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

export default function AdminErpSupport() {
  const api = getAdminApiClient();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erpList, setErpList] = useState<ErpListItem[]>([]);
  const [selectedErp, setSelectedErp] = useState<string>('');
  const [customErpName, setCustomErpName] = useState<string>('');
  const [useCustomErp, setUseCustomErp] = useState(false);
  const [currentErp, setCurrentErp] = useState<ErpSupport | null>(null);
  const [invoiceJson, setInvoiceJson] = useState<string>('{}');
  const [metadataJson, setMetadataJson] = useState<string>('{}');
  const [status, setStatus] = useState<SchemaStatus>(SchemaStatus.ACTIVE);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [rawPayloadJson, setRawPayloadJson] = useState<string>('{}');
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [configStep, setConfigStep] = useState<ConfigStep>('setup');
  const [mappingData, setMappingData] = useState<FieldMapping[]>([]);
  const [arrayMappings, setArrayMappings] = useState<ArrayMapping[]>([]);
  const [nrsSchemas, setNrsSchemas] = useState<NrsSchema[]>([]);
  const [nrsLoading, setNrsLoading] = useState(false);
  const [nrsError, setNrsError] = useState<string | null>(null);
  const [selectedNrsVersion, setSelectedNrsVersion] = useState('');
  const [mappingMode, setMappingMode] = useState<'ai' | 'manual' | null>(null);
  const [generating, setGenerating] = useState(false);
  const [extraTargets, setExtraTargets] = useState<string[]>([]);
  const [extraItemTargets, setExtraItemTargets] = useState<string[]>([]);
  const [newArraySource, setNewArraySource] = useState('');
  const [newArrayTarget, setNewArrayTarget] = useState('');
  const [expandedArrayIdx, setExpandedArrayIdx] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<MappingTestResult | null>(null);
  const [saveErrors, setSaveErrors] = useState<string[] | null>(null);
  const [mappingCanvasRef, setMappingCanvasRef] = useState<any>(null);
  const invoiceEditorRef = useRef<any>(null);
  const metadataEditorRef = useRef<any>(null);
  const payloadEditorRef = useRef<any>(null);
  const { erpOptions: ERP_TYPES } = useSupportedErps({ includeAll: true });
  const mappingContainerRef = useRef<HTMLDivElement>(null);

  const effectiveErp = useCustomErp ? customErpName.toUpperCase() : selectedErp;

  const erpFilters: FilterOption[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: SchemaStatus.ACTIVE, label: 'Active' },
        { value: SchemaStatus.DRAFT, label: 'Draft' },
        { value: SchemaStatus.DEPRECATED, label: 'Deprecated' },
        { value: SchemaStatus.ARCHIVED, label: 'Archived' },
      ],
    },
  ];

  const fetchErpList = async () => {
    setLoading(true);
    try {
      const response = await api.v1.admin.config['supported-erps'].get();

      if (response.error) {
        const errorValue = (response.error as any)?.value;
        if (errorValue?.statusCode === 404 || errorValue?.error?.includes('not found')) {
          setErpList([]);
        } else {
          toast.error(errorValue?.error || 'Failed to fetch supported ERPs');
        }
      } else if (response.data?.data) {
        setErpList(response.data.data as ErpListItem[]);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to fetch supported ERPs');
    } finally {
      setLoading(false);
    }
  };

  const fetchNrsSchemas = async () => {
    setNrsLoading(true);
    setNrsError(null);
    try {
      const response = await (api as any).v1.workflow.transform['nrs-schemas'].get();
      if (response.error) {
        setNrsError((response.error as any)?.value?.error || 'Failed to load NRS schemas');
        setNrsSchemas([]);
      } else {
        const data = response.data?.data ?? response.data ?? [];
        // Backend may return either an array of schemas or a version-keyed
        // map (e.g. { "1.0": {...} }) — handle both, backfilling `version`
        // from the map key when the entry itself doesn't carry one.
        let schemas: NrsSchema[] = [];
        if (Array.isArray(data)) {
          schemas = data;
        } else if (data && typeof data === 'object') {
          schemas = Object.entries(data).map(([key, value]: [string, any]) => ({
            ...value,
            version: value?.version || key,
          }));
        }
        setNrsSchemas(schemas);
      }
    } catch (error: any) {
      setNrsError(error?.message || 'Failed to load NRS schemas');
      setNrsSchemas([]);
    } finally {
      setNrsLoading(false);
    }
  };

  const fetchErpSupport = async (erpType: string) => {
    setLoading(true);
    try {
      const response = await api.v1.admin.config['supported-erps']({ erpType }).get();

      if (response.error) {
        const errorValue = (response.error as any)?.value;
        if (errorValue?.statusCode === 404 || errorValue?.error?.includes('not found')) {
          setCurrentErp(null);
          setInvoiceJson('{}');
          setMetadataJson('{}');
          setMappingData([]);
          setArrayMappings([]);
          setSelectedNrsVersion('');
          setMappingMode(null);
        } else {
          toast.error(errorValue?.error || 'Failed to fetch ERP support');
          setCurrentErp(null);
        }
      } else if (response.data?.data) {
        const data = response.data.data as ErpSupport;
        setCurrentErp(data);

        if (data.fields) {
          setInvoiceJson(JSON.stringify(data.fields, null, 2));
        } else {
          setInvoiceJson('{}');
        }

        if (data.metadata) {
          setMetadataJson(JSON.stringify(data.metadata, null, 2));
          if (data.metadata.status) {
            setStatus(data.metadata.status as SchemaStatus);
          } else if (data.status) {
            setStatus(data.status as SchemaStatus);
          } else {
            setStatus(SchemaStatus.ACTIVE);
          }
          // Restore mapping rules from metadata — prefer the new richer shape,
          // falling back to the legacy flat {source,target}[] for ERPs configured
          // before the mapping engine existed (a valid degenerate FieldMapping[]).
          let restoredMappings: FieldMapping[] = [];
          if (data.metadata.field_mappings && Array.isArray(data.metadata.field_mappings)) {
            restoredMappings = data.metadata.field_mappings;
          } else if (data.metadata.mapping_rules && Array.isArray(data.metadata.mapping_rules)) {
            restoredMappings = data.metadata.mapping_rules;
          } else if (data.mapping_rules && Array.isArray(data.mapping_rules)) {
            restoredMappings = data.mapping_rules;
          }
          setMappingData(restoredMappings);
          setArrayMappings(
            data.metadata.array_mappings && Array.isArray(data.metadata.array_mappings) ? data.metadata.array_mappings : []
          );
          setSelectedNrsVersion(data.metadata.nrs_schema_version || '');
          setMappingMode(restoredMappings.length > 0 ? 'manual' : null);
        } else {
          setMetadataJson('{}');
          if (data.status) {
            setStatus(data.status as SchemaStatus);
          } else {
            setStatus(SchemaStatus.ACTIVE);
          }
          const restoredMappings: FieldMapping[] = data.mapping_rules && Array.isArray(data.mapping_rules) ? data.mapping_rules : [];
          setMappingData(restoredMappings);
          setArrayMappings([]);
          setSelectedNrsVersion('');
          setMappingMode(restoredMappings.length > 0 ? 'manual' : null);
        }
        setTestResult(null);
        setSaveErrors(null);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to fetch ERP support');
      setCurrentErp(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pathname) {
      fetchErpList();
      fetchNrsSchemas();
    }
  }, [pathname]);

  useEffect(() => {
    if (selectedErp && showConfig) {
      fetchErpSupport(selectedErp);
      setIsEditing(true);
    }
  }, [selectedErp, showConfig]);

  // Derive ERP source fields from the invoice JSON
  const erpSourceFields = useMemo(() => {
    try {
      let parsedMetaData = JSON.parse(metadataJson)
      const parsed = (parsedMetaData && parsedMetaData?.source_invoice_sample)? parsedMetaData?.source_invoice_sample : JSON.parse(invoiceJson);
      return flattenObject(parsed);
    } catch {
      return [];
    }
  }, [invoiceJson]);

  // Raw (unflattened) sample invoice — the payload shape needed by the
  // mapping engine's generate/test/save endpoints. Mirrors erpSourceFields'
  // own source_invoice_sample fallback so both stay in sync.
  const parsedSampleInvoice = useMemo(() => {
    try {
      const parsedMetaData = JSON.parse(metadataJson);
      return parsedMetaData && parsedMetaData?.source_invoice_sample ? parsedMetaData.source_invoice_sample : JSON.parse(invoiceJson);
    } catch {
      return null;
    }
  }, [invoiceJson, metadataJson]);

  const selectedSchema = useMemo(
    () => nrsSchemas.find((s) => s.version === selectedNrsVersion) || null,
    [nrsSchemas, selectedNrsVersion]
  );

  // Top-level mapper source fields (drop [*] array-item entries — those are
  // handled by the array mappings sub-section instead)
  const topSourceFields = useMemo(() => erpSourceFields.filter((f) => !f.key.includes('[*]')), [erpSourceFields]);

  const topTargetFields = useMemo(() => {
    const required = (selectedSchema?.required_fields || []).map((f) => ({ key: f, required: true }));
    const extras = extraTargets
      .filter((f) => !(selectedSchema?.required_fields || []).includes(f))
      .map((f) => ({ key: f, required: false }));
    return [...required, ...extras];
  }, [selectedSchema, extraTargets]);

  const itemTargetFields = useMemo(() => {
    const required = (selectedSchema?.required_item_fields || []).map((f) => ({ key: f, required: true }));
    const extras = extraItemTargets
      .filter((f) => !(selectedSchema?.required_item_fields || []).includes(f))
      .map((f) => ({ key: f, required: false }));
    return [...required, ...extras];
  }, [selectedSchema, extraItemTargets]);

  const arraySourcePaths = useMemo(() => findArrayPaths(parsedSampleInvoice), [parsedSampleInvoice]);

  const getItemSourceFields = (sourceArrayPath: string): PickerField[] => {
    const arr = resolvePath(parsedSampleInvoice, sourceArrayPath);
    if (!Array.isArray(arr) || arr.length === 0 || typeof arr[0] !== 'object' || arr[0] === null) return [];
    return flattenObject(arr[0]);
  };

  const validateJson = (jsonString: string): { valid: boolean; error?: string } => {
    try {
      JSON.parse(jsonString);
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  };

  const handleInvoiceChange = (value: string | undefined) => {
    if (value !== undefined) {
      setInvoiceJson(value);
      const validation = validateJson(value);
      if (validation.valid) {
        setInvoiceError(null);
      } else {
        setInvoiceError(validation.error || 'Invalid JSON');
      }
    }
  };

  const handleMetadataChange = (value: string | undefined) => {
    if (value !== undefined) {
      setMetadataJson(value);
      const validation = validateJson(value);
      if (validation.valid) {
        setMetadataError(null);
      } else {
        setMetadataError(validation.error || 'Invalid JSON');
      }
    }
  };

  // Top-level field mapping helpers
  const addFieldMapping = useCallback(
    (source: string, target: string) => {
      setMappingData((prev) => {
        if (prev.some((m) => m.source === source && m.target === target)) return prev;
        const required = !!selectedSchema?.required_fields?.includes(target);
        return [...prev, { source, target, required }];
      });
    },
    [selectedSchema]
  );

  const removeFieldMappingBySource = useCallback((source: string) => {
    setMappingData((prev) => prev.filter((m) => m.source !== source));
  }, []);

  const removeFieldMappingByTarget = useCallback((target: string) => {
    setMappingData((prev) => prev.filter((m) => m.target !== target));
  }, []);

  const removeFieldMappingAt = useCallback((index: number) => {
    setMappingData((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateFieldMapping = useCallback((index: number, patch: Partial<FieldMapping>) => {
    setMappingData((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }, []);

  // Array mapping helpers
  const addArrayMapping = () => {
    if (!newArraySource.trim() || !newArrayTarget.trim()) return;
    setArrayMappings((prev) => [
      ...prev,
      { source_array_path: newArraySource.trim(), target_array_path: newArrayTarget.trim(), item_mappings: [] },
    ]);
    setNewArraySource('');
    setNewArrayTarget('');
  };

  const removeArrayMapping = (idx: number) => {
    setArrayMappings((prev) => prev.filter((_, i) => i !== idx));
  };

  const addItemMapping = (arrIdx: number, source: string, target: string) => {
    setArrayMappings((prev) =>
      prev.map((am, i) => {
        if (i !== arrIdx) return am;
        if (am.item_mappings.some((m) => m.source === source && m.target === target)) return am;
        const required = !!selectedSchema?.required_item_fields?.includes(target);
        return { ...am, item_mappings: [...am.item_mappings, { source, target, required }] };
      })
    );
  };

  const removeItemMappingBySource = (arrIdx: number, source: string) => {
    setArrayMappings((prev) =>
      prev.map((am, i) => (i === arrIdx ? { ...am, item_mappings: am.item_mappings.filter((m) => m.source !== source) } : am))
    );
  };

  const removeItemMappingByTarget = (arrIdx: number, target: string) => {
    setArrayMappings((prev) =>
      prev.map((am, i) => (i === arrIdx ? { ...am, item_mappings: am.item_mappings.filter((m) => m.target !== target) } : am))
    );
  };

  const removeItemMappingAt = (arrIdx: number, itemIdx: number) => {
    setArrayMappings((prev) =>
      prev.map((am, i) => (i === arrIdx ? { ...am, item_mappings: am.item_mappings.filter((_, j) => j !== itemIdx) } : am))
    );
  };

  const updateItemMapping = (arrIdx: number, itemIdx: number, patch: Partial<FieldMapping>) => {
    setArrayMappings((prev) =>
      prev.map((am, i) =>
        i === arrIdx ? { ...am, item_mappings: am.item_mappings.map((m, j) => (j === itemIdx ? { ...m, ...patch } : m)) } : am
      )
    );
  };

  const handleGenerate = async () => {
    if (!parsedSampleInvoice) return;
    setGenerating(true);
    try {
      const response = await (api as any).v1.workflow.transform.mapping.generate.post({
        erp: effectiveErp,
        sample_invoice: parsedSampleInvoice,
        nrs_version: selectedNrsVersion,
      });
      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to generate mapping template');
        return;
      }
      const template: MappingTemplate = response.data?.data ?? response.data;
      const nextFieldMappings = template?.field_mappings || [];
      const nextArrayMappings = template?.array_mappings || [];
      setMappingData(nextFieldMappings);
      setArrayMappings(nextArrayMappings);

      const reqFields = new Set(selectedSchema?.required_fields || []);
      setExtraTargets(Array.from(new Set(nextFieldMappings.map((m) => m.target).filter((t) => !reqFields.has(t)))));
      const reqItemFields = new Set(selectedSchema?.required_item_fields || []);
      setExtraItemTargets(
        Array.from(
          new Set(nextArrayMappings.flatMap((am) => am.item_mappings.map((m) => m.target)).filter((t) => !reqItemFields.has(t)))
        )
      );

      toast.success('AI-generated mapping template ready — review and adjust as needed');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate mapping template');
    } finally {
      setGenerating(false);
    }
  };

  const handleTest = async () => {
    if (!parsedSampleInvoice) return;
    setTesting(true);
    setTestResult(null);
    try {
      const template: MappingTemplate = {
        erp_source: effectiveErp,
        nrs_schema_version: selectedNrsVersion,
        field_mappings: mappingData,
        array_mappings: arrayMappings,
      };
      const response = await (api as any).v1.workflow.transform.mapping.test.post({
        sample_invoice: parsedSampleInvoice,
        template,
      });
      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Mapping test failed');
        return;
      }
      const result: MappingTestResult = response.data?.data ?? response.data;
      setTestResult(result);
    } catch (error: any) {
      toast.error(error?.message || 'Mapping test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!effectiveErp) {
      toast.error('Please select or enter an ERP type');
      return;
    }

    if (!selectedNrsVersion) {
      toast.error('Select an NRS target schema first');
      setConfigStep('setup');
      return;
    }

    const invoiceValidation = validateJson(invoiceJson);
    const metadataValidation = validateJson(metadataJson);

    if (!invoiceValidation.valid) {
      toast.error(`Invoice JSON is invalid: ${invoiceValidation.error}`);
      setInvoiceError(invoiceValidation.error || 'Invalid JSON');
      setConfigStep('schema');
      return;
    }

    if (!metadataValidation.valid) {
      toast.error(`Metadata JSON is invalid: ${metadataValidation.error}`);
      setMetadataError(metadataValidation.error || 'Invalid JSON');
      setConfigStep('schema');
      return;
    }

    if (mappingData.length === 0) {
      toast.error('Add at least one field mapping first');
      setConfigStep('mapping');
      return;
    }

    setSaving(true);
    setSaveErrors(null);
    try {
      const invoiceData = JSON.parse(invoiceJson);
      const metadataData = JSON.parse(metadataJson);

      // The mapping engine's own gatekeeper validates the template first —
      // if it rejects, we stop here and never touch the ERP support record.
      const template: MappingTemplate = {
        erp_source: effectiveErp,
        nrs_schema_version: selectedNrsVersion,
        field_mappings: mappingData,
        array_mappings: arrayMappings,
      };
      const mapResponse = await (api as any).v1.workflow.transform.mapping.save.post({
        erp: effectiveErp,
        sample_invoice: invoiceData,
        template,
      });

      if (mapResponse.error) {
        const errorValue = (mapResponse.error as any)?.value;
        const errors = errorValue?.validation_errors;
        if (Array.isArray(errors) && errors.length > 0) {
          setSaveErrors(errors);
          toast.error('Mapping failed validation — see errors below');
        } else {
          toast.error(errorValue?.error || 'Failed to save mapping template');
        }
        return;
      }
      setSaveErrors(null);

      const metadataWithStatus = {
        ...metadataData,
        status: status,
        nrs_schema_version: selectedNrsVersion,
        field_mappings: mappingData,
        array_mappings: arrayMappings,
        mapping_rules: mappingData.map(({ source, target }) => ({ source, target })),
      };

      const response = await api.v1.admin.config['supported-erps'].post({
        erp: effectiveErp as any,
        invoice: invoiceData,
        metadata: metadataWithStatus,
      });

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Mapping activated, but failed to update ERP support record';
        toast.error(errorMessage);
      } else if (response.data?.data) {
        toast.success('ERP mapping saved and activated');
        await fetchErpList();
        await fetchErpSupport(effectiveErp);
        setShowConfig(false);
        setIsEditing(false);
        setConfigStep('setup');
        setUseCustomErp(false);
        setCustomErpName('');
      } else {
        toast.error('Unexpected response format');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save ERP support');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (erpType: string) => {
    setSelectedErp(erpType);
    setUseCustomErp(false);
    setCustomErpName('');
    setShowConfig(true);
    setIsEditing(true);
    setIsViewMode(false);
    setConfigStep('setup');
  };

  const handleView = (erpType: string) => {
    setSelectedErp(erpType);
    setUseCustomErp(false);
    setCustomErpName('');
    setShowConfig(true);
    setIsEditing(true);
    setIsViewMode(true);
    setConfigStep('setup');
  };

  const handleAddNew = () => {
    setSelectedErp('');
    setCustomErpName('');
    setUseCustomErp(false);
    setCurrentErp(null);
    setInvoiceJson('{}');
    setMetadataJson('{}');
    setMappingData([]);
    setArrayMappings([]);
    setSelectedNrsVersion('');
    setMappingMode(null);
    setExtraTargets([]);
    setExtraItemTargets([]);
    setTestResult(null);
    setSaveErrors(null);
    setStatus(SchemaStatus.DRAFT);
    setInvoiceError(null);
    setMetadataError(null);
    setShowConfig(true);
    setIsEditing(false);
    setIsViewMode(false);
    setConfigStep('setup');
  };

  const handleCancel = () => {
    if (currentErp) {
      if (currentErp.fields) {
        setInvoiceJson(JSON.stringify(currentErp.fields, null, 2));
      }
      if (currentErp.metadata) {
        setMetadataJson(JSON.stringify(currentErp.metadata, null, 2));
      }
      if (currentErp.status) {
        setStatus(currentErp.status as SchemaStatus);
      }
    }
    setShowConfig(false);
    setIsEditing(false);
    setIsViewMode(false);
    setConfigStep('setup');
    setInvoiceError(null);
    setMetadataError(null);
    setUseCustomErp(false);
    setCustomErpName('');
    setTestResult(null);
    setSaveErrors(null);
    setExtraTargets([]);
    setExtraItemTargets([]);
  };

  const handleProcessPayload = () => {
    try {
      const { invoice, metadata } = extractJsonWithMetadata(rawPayloadJson);

      if (!invoice || Object.keys(invoice).length === 0) {
        toast.warning('No invoice found in payload. Please ensure the payload contains a valid invoice object.');
        setPayloadError('No invoice object found in payload');
        return;
      }

      setInvoiceJson(JSON.stringify(invoice, null, 2));
      setMetadataJson(JSON.stringify(metadata, null, 2));
      setInvoiceError(null);
      setMetadataError(null);
      setPayloadError(null);
      setShowProcessModal(false);

      toast.success(`Payload processed successfully. Extracted ${Object.keys(invoice).length} invoice fields and ${Object.keys(metadata).length} metadata.`);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to process payload';
      setPayloadError(errorMessage);
      toast.error(`Failed to process payload: ${errorMessage}`);
    }
  };

  const handleEditorDidMount = (editor: any, monaco: any, type: 'invoice' | 'metadata' | 'payload') => {
    if (type === 'invoice') {
      invoiceEditorRef.current = editor;
    } else if (type === 'metadata') {
      metadataEditorRef.current = editor;
    } else if (type === 'payload') {
      payloadEditorRef.current = editor;
    }
  };

  const canProceedFromSetup = !!effectiveErp && !!selectedNrsVersion;
  const canProceedFromSchema = !invoiceError && !metadataError && invoiceJson !== '{}';

  const handleNextStep = () => {
    const stepIdx = CONFIG_STEPS.findIndex(s => s.id === configStep);
    if (stepIdx < CONFIG_STEPS.length - 1) {
      setConfigStep(CONFIG_STEPS[stepIdx + 1].id);
    }
  };

  const handlePrevStep = () => {
    const stepIdx = CONFIG_STEPS.findIndex(s => s.id === configStep);
    if (stepIdx > 0) {
      setConfigStep(CONFIG_STEPS[stepIdx - 1].id);
    }
  };

  // Stepper component
  const Stepper = () => (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-6">
      {CONFIG_STEPS.map((step, idx) => {
        const currentIdx = CONFIG_STEPS.findIndex(s => s.id === configStep);
        const isActive = step.id === configStep;
        const isCompleted = idx < currentIdx;
        return (
          <div key={step.id} className="flex items-center gap-2 sm:flex-1">
            <button
              onClick={() => {
                if (isCompleted || isActive) setConfigStep(step.id);
              }}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg border transition-all w-full text-left',
                isActive && 'border-primary bg-primary/5 shadow-sm',
                isCompleted && 'border-success/30 bg-success/5 cursor-pointer',
                !isActive && !isCompleted && 'border-muted opacity-60'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0',
                  isActive && 'bg-primary text-primary-foreground',
                  isCompleted && 'bg-success text-success-foreground',
                  !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{step.label}</p>
                <p className="text-xs text-muted-foreground truncate">{step.description}</p>
              </div>
            </button>
            {idx < CONFIG_STEPS.length - 1 && (
              <ChevronRight className="hidden sm:block w-4 h-4 text-muted-foreground shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );

  // Process Modal Component
  const ProcessModal = () => (
    <Dialog open={showProcessModal} onOpenChange={setShowProcessModal}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Process ERP Payload</DialogTitle>
          <DialogDescription>
            Paste the complete ERP dictionary JSON payload. The system will automatically extract the invoice and metadata.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          <div className="flex-1 border rounded-lg overflow-hidden" style={{ height: '400px', minHeight: '400px' }}>
            <Editor
              height="400px"
              defaultLanguage="json"
              language="json"
              value={rawPayloadJson}
              onChange={(value) => {
                if (value !== undefined) {
                  setRawPayloadJson(value);
                }
              }}
              onMount={(editor, monaco) => handleEditorDidMount(editor, monaco, 'payload')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                formatOnPaste: true,
                formatOnType: true,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                tabSize: 2,
              }}
              loading={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              }
            />
          </div>
          {payloadError && (
            <p className="text-sm text-destructive">{payloadError}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowProcessModal(false);
              setRawPayloadJson('{}');
              setPayloadError(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleProcessPayload}
            disabled={!!payloadError || !rawPayloadJson.trim()}
          >
            Process
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ===== Field Mapping Step (deterministic mapping engine) =====
  const FieldMappingStep = () => {
    if (erpSourceFields.length === 0) {
      return (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Link2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No source fields available</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Go back to the Schema step and define the invoice JSON to generate source fields for mapping.
                </p>
              </div>
              <Button variant="outline" onClick={handlePrevStep} className="rounded-full mt-4">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Schema
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!selectedSchema) {
      return (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <FileJson className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No NRS schema selected</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Go back to the Setup step and select an NRS target schema version to enable field mapping.
                </p>
              </div>
              <Button variant="outline" onClick={() => setConfigStep('setup')} className="rounded-full mt-4">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6" ref={mappingContainerRef}>
        {saveErrors && saveErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Save Blocked — Validation Errors</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {saveErrors.map((err, idx) => (
                  <li key={idx} className="text-sm">{err}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Mode toggle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            className={cn('cursor-pointer transition-all', mappingMode === 'ai' && 'border-primary bg-primary/5 shadow-sm')}
            onClick={() => setMappingMode('ai')}
          >
            <CardContent className="pt-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">AI Auto-Generate</h3>
                <p className="text-sm text-muted-foreground">
                  Draft a starting mapping template automatically from the sample invoice and NRS schema, then refine it below.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={cn('cursor-pointer transition-all', mappingMode === 'manual' && 'border-primary bg-primary/5 shadow-sm')}
            onClick={() => setMappingMode('manual')}
          >
            <CardContent className="pt-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <PenLine className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Manual</h3>
                <p className="text-sm text-muted-foreground">Connect every field yourself using the mapper below.</p>
              </div>
            </CardContent>
          </Card>
        </div>
        {mappingMode === 'ai' && (
          <div className="flex justify-end">
            <Button onClick={handleGenerate} disabled={generating} className="rounded-full">
              {generating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Generate with AI</>
              )}
            </Button>
          </div>
        )}

        {/* Mapping stats */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span>{topSourceFields.length} source fields</span>
          <span>-</span>
          <span>{topTargetFields.length} target fields</span>
          <span>-</span>
          <Badge variant="secondary">{mappingData.length} mappings</Badge>
          {mappingData.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setMappingData([])}
            >
              <Unlink className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        <ConnectMapper
          sourceFields={topSourceFields}
          targetFields={topTargetFields}
          mappings={mappingData}
          onConnect={addFieldMapping}
          onRemoveBySource={removeFieldMappingBySource}
          onRemoveByTarget={removeFieldMappingByTarget}
          sourceLabel={`${effectiveErp} Fields`}
          targetLabel="NRS Fields"
          onAddCustomTarget={(path) => setExtraTargets((prev) => (prev.includes(path) ? prev : [...prev, path]))}
        />

        {/* Active Mappings */}
        {mappingData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active Mappings ({mappingData.length})</CardTitle>
              <CardDescription>Expand a mapping to configure transform, fallback sources, or a default value</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[320px]">
                <div className="space-y-1">
                  {mappingData.map((m, idx) => (
                    <MappingRow
                      key={`${m.source}-${m.target}-${idx}`}
                      mapping={m}
                      onRemove={() => removeFieldMappingAt(idx)}
                      onChange={(patch) => updateFieldMapping(idx, patch)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Array / Line-Item Mappings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Array / Line-Item Mappings</CardTitle>
            <CardDescription>Map repeating structures (e.g. invoice line items) separately from top-level fields</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Source Array Path</Label>
                {arraySourcePaths.length > 0 ? (
                  <Select value={newArraySource} onValueChange={setNewArraySource}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select detected array..." />
                    </SelectTrigger>
                    <SelectContent>
                      {arraySourcePaths.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="e.g. line_items"
                    value={newArraySource}
                    onChange={(e) => setNewArraySource(e.target.value)}
                    className="h-9"
                  />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Target Array Path</Label>
                <Input
                  placeholder="e.g. invoice_line"
                  value={newArrayTarget}
                  onChange={(e) => setNewArrayTarget(e.target.value)}
                  className="h-9"
                />
              </div>
              <Button onClick={addArrayMapping} disabled={!newArraySource.trim() || !newArrayTarget.trim()} className="rounded-full h-9">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            {arrayMappings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No array mappings yet.</p>
            ) : (
              <div className="space-y-3">
                {arrayMappings.map((am, arrIdx) => {
                  const itemSourceFields = getItemSourceFields(am.source_array_path);
                  const isExpanded = expandedArrayIdx === arrIdx;
                  return (
                    <Card key={`${am.source_array_path}-${arrIdx}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setExpandedArrayIdx(isExpanded ? null : arrIdx)}
                            className="p-0.5 hover:bg-muted rounded shrink-0"
                          >
                            <ChevronDown className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
                          </button>
                          <code className="text-xs font-mono text-primary">{am.source_array_path}</code>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                          <code className="text-xs font-mono text-success">{am.target_array_path}</code>
                          <Badge variant="secondary" className="text-[10px]">{am.item_mappings.length} item mappings</Badge>
                          <button
                            onClick={() => removeArrayMapping(arrIdx)}
                            className="ml-auto p-1 hover:bg-destructive/10 rounded"
                            title="Remove array mapping"
                          >
                            <Unlink className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      </CardHeader>
                      {isExpanded && (
                        <CardContent className="space-y-4">
                          <ConnectMapper
                            sourceFields={itemSourceFields}
                            targetFields={itemTargetFields}
                            mappings={am.item_mappings}
                            onConnect={(source, target) => addItemMapping(arrIdx, source, target)}
                            onRemoveBySource={(source) => removeItemMappingBySource(arrIdx, source)}
                            onRemoveByTarget={(target) => removeItemMappingByTarget(arrIdx, target)}
                            sourceLabel="Item Fields"
                            targetLabel="NRS Item Fields"
                            onAddCustomTarget={(path) =>
                              setExtraItemTargets((prev) => (prev.includes(path) ? prev : [...prev, path]))
                            }
                          />
                          {am.item_mappings.length > 0 && (
                            <div className="space-y-1">
                              {am.item_mappings.map((m, itemIdx) => (
                                <MappingRow
                                  key={`${m.source}-${m.target}-${itemIdx}`}
                                  mapping={m}
                                  onRemove={() => removeItemMappingAt(arrIdx, itemIdx)}
                                  onChange={(patch) => updateItemMapping(arrIdx, itemIdx, patch)}
                                />
                              ))}
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test & Preview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base">Test & Preview</CardTitle>
                <CardDescription>Run the deterministic dry-run against your sample invoice before saving</CardDescription>
              </div>
              <Button onClick={handleTest} disabled={testing || mappingData.length === 0} className="rounded-full">
                {testing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Testing...</>
                ) : (
                  <><PlayCircle className="w-4 h-4 mr-2" />Test Mapping</>
                )}
              </Button>
            </div>
          </CardHeader>
          {testResult && (
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className={cn('status-badge', testResult.valid ? 'status-active' : 'status-error')}>
                  {testResult.valid ? (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 mr-1 inline" />
                  )}
                  {testResult.valid ? 'Valid' : 'Invalid'}
                </span>
                <span className="text-sm text-muted-foreground">Executed in {testResult.execution_time_ms}ms</span>
              </div>

              {!testResult.valid && testResult.validation_errors?.length > 0 && (
                <Alert variant="destructive">
                  <AlertTitle>Validation Errors</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      {testResult.validation_errors.map((err, idx) => (
                        <li key={idx} className="text-sm">{err}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Original Invoice</p>
                  <div className="border rounded-lg overflow-hidden" style={{ height: '350px' }}>
                    <Editor
                      height="100%"
                      defaultLanguage="json"
                      language="json"
                      value={invoiceJson}
                      theme="vs-dark"
                      options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', automaticLayout: true, scrollBeyondLastLine: false }}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Transformed Invoice</p>
                  <div className="border rounded-lg overflow-hidden" style={{ height: '350px' }}>
                    <Editor
                      height="100%"
                      defaultLanguage="json"
                      language="json"
                      value={JSON.stringify(testResult.transformed_invoice, null, 2)}
                      theme="vs-dark"
                      options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', automaticLayout: true, scrollBeyondLastLine: false }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    );
  };

  // Read-only mapping summary shown in view mode — no field pickers, no
  // remove/clear actions, just the mappings already saved (with transform/
  // required badges when present) plus an array-mappings summary.
  const ReadOnlyMappingsList = () => (
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
            <ScrollArea className="max-h-[500px]">
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
            </ScrollArea>
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

  // Read-only key/type table for a flattened schema (invoice fields or metadata)
  const FieldTable = ({ fields }: { fields: { key: string; type: string }[] }) => (
    fields.length === 0 ? (
      <p className="text-sm text-muted-foreground py-4 text-center">No fields defined.</p>
    ) : (
      <ScrollArea className="max-h-[500px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b">
              <th className="pb-2 font-medium">Field</th>
              <th className="pb-2 font-medium">Type</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.key} className="border-b border-border/50 last:border-0">
                <td className="py-2 pr-4">
                  <code className="text-xs font-mono">{f.key}</code>
                </td>
                <td className="py-2">
                  <Badge variant="outline" className="text-[10px]">{f.type}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    )
  );

  // View mode — single-page, read-only detail view (no wizard/stepper)
  if (showConfig && isViewMode) {
    let invoiceFields: { key: string; type: string }[] = [];
    let metadataFields: { key: string; type: string }[] = [];
    try {
      invoiceFields = flattenObject(JSON.parse(invoiceJson || '{}'));
    } catch {
      // malformed/empty JSON — leave the table empty
    }
    try {
      metadataFields = flattenObject(JSON.parse(metadataJson || '{}'));
    } catch {
      // malformed/empty JSON — leave the table empty
    }

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="page-title flex items-center gap-3">
                {formatErpName(effectiveErp)}
                <StatusBadge status={status} />
              </h1>
              <p className="page-subtitle">ERP support configuration</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleCancel} variant="outline" className="rounded-full">
              Back
            </Button>
            <Button onClick={() => setIsViewMode(false)} className="rounded-full">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Schema Fields</CardTitle>
              <CardDescription>{invoiceFields.length} fields</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldTable fields={invoiceFields} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Metadata Fields</CardTitle>
              <CardDescription>{metadataFields.length} fields</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldTable fields={metadataFields} />
            </CardContent>
          </Card>
        </div>

        <ReadOnlyMappingsList />
      </div>
    );
  }

  // Configuration mode
  if (showConfig) {
    return (
      <>
        <ProcessModal />
        <div className="space-y-6 animate-fade-in">
          <div className="page-header">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="rounded-full"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="page-title">ERP Support</h1>
                <p className="page-subtitle">
                  {isEditing
                    ? `Edit ERP Support - ${effectiveErp}`
                    : 'Add New ERP Support'
                  }
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {configStep !== 'setup' && (
                <Button
                  onClick={handlePrevStep}
                  variant="outline"
                  className="rounded-full"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              )}
              <Button
                onClick={handleCancel}
                variant="outline"
                className="rounded-full"
              >
                Cancel
              </Button>
              {configStep !== 'mapping' ? (
                <Button
                  onClick={handleNextStep}
                  disabled={
                    (configStep === 'setup' && !canProceedFromSetup) ||
                    (configStep === 'schema' && !canProceedFromSchema)
                  }
                  className="rounded-full"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={saving || loading || !!invoiceError || !!metadataError || !effectiveErp || !selectedNrsVersion || mappingData.length === 0}
                  className="rounded-full"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isEditing ? 'Update ERP Support' : 'Create ERP Support'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Stepper */}
          <Stepper />

          {/* Step 1: Setup */}
          {configStep === 'setup' && (
            <div className="space-y-6">
              {/* ERP Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>ERP Type</CardTitle>
                  <CardDescription>
                    Choose from a known ERP system or enter a custom name
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                 {!isEditing && <div className="flex items-center gap-4">
                    <Button
                      variant={!useCustomErp ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setUseCustomErp(false);
                        setCustomErpName('');
                      }}
                      className="rounded-full"
                    >
                      Select from list
                    </Button>
                    <Button
                      variant={useCustomErp ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setUseCustomErp(true);
                        setSelectedErp('');
                      }}
                      className="rounded-full"
                    >
                      Enter custom name
                    </Button>
                  </div> }

                  {!useCustomErp ? (
                    <Select
                      value={selectedErp}
                      onValueChange={(value) => {
                        setSelectedErp(value);
                        if (value) {
                          fetchErpSupport(value);
                          setIsEditing(true);
                        } else {
                          setCurrentErp(null);
                          setIsEditing(false);
                        }
                      }}
                      disabled={isEditing && !!currentErp}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an ERP type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ERP_TYPES.map((erp) => (
                          <SelectItem key={erp} value={erp}>
                            {formatErpName(erp)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="custom-erp">Custom ERP Name</Label>
                      <Input
                        id="custom-erp"
                        placeholder="e.g. MY_CUSTOM_ERP"
                        value={customErpName}
                        onChange={(e) => setCustomErpName(e.target.value)}
                        disabled={isEditing && !!currentErp}
                      />
                      <p className="text-xs text-muted-foreground">
                        The name will be stored in uppercase. Use underscores for spaces.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Status Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                  <CardDescription>
                    Set the status of this ERP support configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as SchemaStatus)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SchemaStatus.DRAFT}>
                        Draft - Work in progress
                      </SelectItem>
                      <SelectItem value={SchemaStatus.ACTIVE}>
                        Active - Ready for use
                      </SelectItem>
                      <SelectItem value={SchemaStatus.DEPRECATED}>
                        Deprecated - No longer recommended
                      </SelectItem>
                      <SelectItem value={SchemaStatus.ARCHIVED}>
                        Archived - Historical record
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="mt-2">
                    <StatusBadge status={status} />
                  </div>
                </CardContent>
              </Card>

              {/* NRS Target Schema */}
              <Card>
                <CardHeader>
                  <CardTitle>NRS Target Schema</CardTitle>
                  <CardDescription>
                    Select the versioned NRS schema this ERP will map to
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {nrsLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : nrsSchemas.length === 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{nrsError || 'No NRS schemas registered yet'}</span>
                      <Button variant="ghost" size="sm" onClick={fetchNrsSchemas}>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Retry
                      </Button>
                    </div>
                  ) : (
                    <Select value={selectedNrsVersion} onValueChange={setSelectedNrsVersion}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select NRS schema version" />
                      </SelectTrigger>
                      <SelectContent>
                        {nrsSchemas.map((s) => (
                          <SelectItem key={s.version} value={s.version}>
                            {s.name} ({s.version})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedSchema && (
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>{selectedSchema.required_fields?.length || 0} required fields</span>
                      <span>{selectedSchema.required_item_fields?.length || 0} required item fields</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Schema */}
          {configStep === 'schema' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Invoice Schema Editor */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Invoice Schema</CardTitle>
                      <CardDescription>
                        Define the invoice schema structure as a JSON object
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowProcessModal(true)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                    <Editor
                      height="100%"
                      defaultLanguage="json"
                      language="json"
                      value={invoiceJson}
                      onChange={handleInvoiceChange}
                      onMount={(editor, monaco) => handleEditorDidMount(editor, monaco, 'invoice')}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: 'on',
                        formatOnPaste: true,
                        formatOnType: true,
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        tabSize: 2,
                      }}
                      loading={
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      }
                    />
                  </div>
                  {invoiceError && (
                    <p className="text-sm text-destructive mt-2">{invoiceError}</p>
                  )}
                </CardContent>
              </Card>

              {/* Metadata Editor */}
              <Card>
                <CardHeader>
                  <CardTitle>Metadata</CardTitle>
                  <CardDescription>
                    Define the metadata structure as a JSON object
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                    <Editor
                      height="100%"
                      defaultLanguage="json"
                      language="json"
                      value={metadataJson}
                      onChange={handleMetadataChange}
                      onMount={(editor, monaco) => handleEditorDidMount(editor, monaco, 'metadata')}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: 'on',
                        formatOnPaste: true,
                        formatOnType: true,
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        tabSize: 2,
                      }}
                      loading={
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      }
                    />
                  </div>
                  {metadataError && (
                    <p className="text-sm text-destructive mt-2">{metadataError}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Field Mapping */}
          {configStep === 'mapping' && (
            nrsLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mr-2" />
                    <span className="text-muted-foreground">Loading NRS schemas...</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <FieldMappingStep />
            )
          )}
        </div>
      </>
    );
  }

  // List view
  const columns: Column<ErpListItem>[] = [
    {
      key: 'source_type',
      header: 'ERP System',
      sortable: true,
      accessor: (erp) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Server className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{formatErpName(erp.source_type)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (erp) => <StatusBadge status={erp.status} />,
    },
    {
      key: 'last_updated',
      header: 'Last Updated',
      sortable: true,
      accessor: (erp) => (
        <span className="text-sm text-muted-foreground">
          {new Date(erp.last_updated).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    const sorted = [...erpList].sort((a, b) => {
      let aVal: any = a[key as keyof ErpListItem];
      let bVal: any = b[key as keyof ErpListItem];

      if (key === 'last_updated') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
    setErpList(sorted);
  };

  const filteredErpList = erpList.filter((erp) => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      if (!erp.source_type.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    if (filters.status && filters.status !== 'all') {
      if (erp.status !== filters.status) {
        return false;
      }
    }

    return true;
  });

  const rowActions = (erp: ErpListItem) => (
    <>
      <DropdownMenuItem onClick={() => handleView(erp.source_type)}>
        <Eye className="w-4 h-4 mr-2" />
        View Details
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handleEdit(erp.source_type)}>
        <Edit className="w-4 h-4 mr-2" />
        Edit Mapping
      </DropdownMenuItem>
    </>
  );

  return (
    <>
      <ProcessModal />
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">ERP Support Management</h1>
            <p className="page-subtitle">Manage supported ERP systems and field mappings</p>
          </div>
          <Button
            onClick={handleAddNew}
            className="rounded-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add ERP
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">{erpList.length}</p>
                <p className="text-muted-foreground">Supported ERPs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-success">
                  {erpList.filter(e => e.status === 'active').length}
                </p>
                <p className="text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {erpList.filter(e => e.status !== SchemaStatus.ACTIVE.toLowerCase()).length}
                </p>
                <p className="text-muted-foreground">Inactive</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mr-2" />
                <span className="text-muted-foreground">Loading ERP support list...</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <DataTable
            data={filteredErpList}
            columns={columns}
            searchPlaceholder="Search ERP systems by name..."
            filters={erpFilters}
            rowActions={rowActions}
            onRowClick={(erp) => handleView(erp.source_type)}
            onSearch={setSearchQuery}
            onFilterChange={setFilters}
            onSort={handleSort}
            emptyMessage="No ERP systems configured. Click 'Add ERP' to get started."
          />
        )}
      </div>
    </>
  );
}
