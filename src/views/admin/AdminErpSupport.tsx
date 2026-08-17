'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileJson, Save, Loader2, Edit, Settings, Calendar, Clock, ArrowLeft, Server, Plus, Check, ChevronRight, ChevronLeft, Link2, Unlink } from 'lucide-react';
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
import { extractJsonWithMetadata } from '@/lib/schema/firs-extractor';
import { DataTable, Column, FilterOption, StatusBadge } from '@/components/shared';
import { useSupportedErps, formatErpName } from '@/hooks/use-supported-erps';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

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

interface FirsDictionaryField {
  field_id: string;
  field_path: string;
  data_type: string;
  format: string;
  validation_rules: string;
  description: string;
  example_value: any;
  is_required: boolean;
  is_array: boolean;
  enum_values: any[];
  mapping_hints: any[];
}

interface MappingRule {
  source: string;
  target: string;
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
  { id: 'mapping', label: 'Field Mapping', description: 'Map to NRS UBL' },
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
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [rawPayloadJson, setRawPayloadJson] = useState<string>('{}');
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [configStep, setConfigStep] = useState<ConfigStep>('setup');
  const [firsFields, setFirsFields] = useState<FirsDictionaryField[]>([]);
  const [firsLoading, setFirsLoading] = useState(false);
  const [mappingData, setMappingData] = useState<MappingRule[]>([]);
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

  const fetchFirsDictionary = async () => {
    setFirsLoading(true);
    try {
      const response = await api.v1.admin.config['firs-dictionary'].get();
      if (response.error) {
        const errorValue = (response.error as any)?.value;
        if (errorValue?.statusCode === 404 || errorValue?.error?.includes('not found')) {
          setFirsFields([]);
        }
      } else if (response.data && 'data' in response.data && response.data.data) {
        const data = response.data.data as any;
        if (data.fields && Array.isArray(data.fields)) {
          setFirsFields(data.fields);
        }
      }
    } catch {
      // Silently fail - NRS dictionary may not exist yet
      setFirsFields([]);
    } finally {
      setFirsLoading(false);
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
          // Restore mapping rules from metadata
          if (data.metadata.mapping_rules && Array.isArray(data.metadata.mapping_rules)) {
            setMappingData(data.metadata.mapping_rules);
          } else if (data.mapping_rules && Array.isArray(data.mapping_rules)) {
            setMappingData(data.mapping_rules);
          } else {
            setMappingData([]);
          }
        } else {
          setMetadataJson('{}');
          if (data.status) {
            setStatus(data.status as SchemaStatus);
          } else {
            setStatus(SchemaStatus.ACTIVE);
          }
          if (data.mapping_rules && Array.isArray(data.mapping_rules)) {
            setMappingData(data.mapping_rules);
          } else {
            setMappingData([]);
          }
        }
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
      fetchFirsDictionary();
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

  // Derive NRS target fields from the dictionary
  const firsTargetFields = useMemo(() => {
    return firsFields.map((f) => ({
      key: f.field_path || f.field_id,
      type: f.data_type,
      required: f.is_required,
      description: f.description,
    }));
  }, [firsFields]);

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

  const handleSave = async () => {
    if (!effectiveErp) {
      toast.error('Please select or enter an ERP type');
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

    setSaving(true);
    try {
      const invoiceData = JSON.parse(invoiceJson);
      const metadataData = JSON.parse(metadataJson);

      const metadataWithStatus = {
        ...metadataData,
        status: status,
        mapping_rules: mappingData,
      };

      const response = await api.v1.admin.config['supported-erps'].post({
        erp: effectiveErp as any,
        invoice: invoiceData,
        metadata: metadataWithStatus,
      });

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Failed to save ERP support';
        toast.error(errorMessage);
      } else if (response.data?.data) {
        toast.success('ERP support saved successfully');
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
    setStatus(SchemaStatus.DRAFT);
    setInvoiceError(null);
    setMetadataError(null);
    setShowConfig(true);
    setIsEditing(false);
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
    setConfigStep('setup');
    setInvoiceError(null);
    setMetadataError(null);
    setUseCustomErp(false);
    setCustomErpName('');
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

  const canProceedFromSetup = !!effectiveErp;
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

  // Mapping helpers
  const addMapping = useCallback((sourceKey: string, targetKey: string) => {
    setMappingData(prev => {
      // Don't add duplicates
      if (prev.some(m => m.source === sourceKey && m.target === targetKey)) return prev;
      return [...prev, { source: sourceKey, target: targetKey }];
    });
  }, []);

  const removeMapping = useCallback((sourceKey: string, targetKey: string) => {
    setMappingData(prev => prev.filter(m => !(m.source === sourceKey && m.target === targetKey)));
  }, []);

  const removeMappingBySource = useCallback((sourceKey: string) => {
    setMappingData(prev => prev.filter(m => m.source !== sourceKey));
  }, []);

  const removeMappingByTarget = useCallback((targetKey: string) => {
    setMappingData(prev => prev.filter(m => m.target !== targetKey));
  }, []);

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

  // ===== Field Mapping Component (react-data-mapping) =====
  const FieldMappingStep = () => {
    const [selectedSource, setSelectedSource] = useState<string | null>(null);
    const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
    const [sourceSearch, setSourceSearch] = useState('');
    const [targetSearch, setTargetSearch] = useState('');

    const filteredSourceFields = useMemo(() => {
      if (!sourceSearch) return erpSourceFields;
      const q = sourceSearch.toLowerCase();
      return erpSourceFields.filter(f => f.key.toLowerCase().includes(q));
    }, [sourceSearch, erpSourceFields]);

    const filteredTargetFields = useMemo(() => {
      if (!targetSearch) return firsTargetFields;
      const q = targetSearch.toLowerCase();
      return firsTargetFields.filter(f => f.key.toLowerCase().includes(q));
    }, [targetSearch, firsTargetFields]);

    // Get mappings for a source/target field
    const getMappingsForSource = (key: string) => mappingData.filter(m => m.source === key);
    const getMappingsForTarget = (key: string) => mappingData.filter(m => m.target === key);

    const handleConnect = () => {
      if (selectedSource && selectedTarget) {
        addMapping(selectedSource, selectedTarget);
        setSelectedSource(null);
        setSelectedTarget(null);
      }
    };

    // Auto-connect when both source and target are selected
    useEffect(() => {
      if (selectedSource && selectedTarget) {
        handleConnect();
      }
    }, [selectedSource, selectedTarget]);

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

    if (firsTargetFields.length === 0 && !firsLoading) {
      return (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <FileJson className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">NRS Dictionary not configured</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  The NRS UBL Invoice Schema has not been set up yet. Configure it from the NRS Dictionary page to enable field mapping.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {/* Mapping stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{erpSourceFields.length} source fields</span>
          <span>-</span>
          <span>{firsTargetFields.length} target fields</span>
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

        {/* Mapping UI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" ref={mappingContainerRef}>
          {/* Source (ERP Fields) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="w-4 h-4" />
                {effectiveErp} Fields
              </CardTitle>
              <Input
                placeholder="Search source fields..."
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
                className="mt-2"
              />
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-0.5 p-3">
                  {filteredSourceFields.map((field) => {
                    const mappings = getMappingsForSource(field.key);
                    const isMapped = mappings.length > 0;
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
                          <Badge variant="outline" className="text-[10px] shrink-0">{field.type}</Badge>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isMapped && (
                            <Badge variant="secondary" className="text-[10px]">
                              {mappings.length}
                            </Badge>
                          )}
                          {isMapped && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeMappingBySource(field.key);
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

          {/* Target (NRS UBL Fields) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileJson className="w-4 h-4" />
                NRS UBL Fields
              </CardTitle>
              <Input
                placeholder="Search target fields..."
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
                className="mt-2"
              />
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-0.5 p-3">
                  {filteredTargetFields.map((field) => {
                    const mappings = getMappingsForTarget(field.key);
                    const isMapped = mappings.length > 0;
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
                          <Badge variant="outline" className="text-[10px] shrink-0">{field.type}</Badge>
                          {field.required && (
                            <Badge className="bg-destructive/10 text-destructive text-[10px] shrink-0">req</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isMapped && (
                            <Badge variant="secondary" className="text-[10px]">
                              {mappings.length}
                            </Badge>
                          )}
                          {isMapped && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeMappingByTarget(field.key);
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
        </div>

        {/* Current Mappings */}
        {mappingData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Active Mappings ({mappingData.length})</CardTitle>
              <CardDescription>
                Click the unlink icon to remove a mapping
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1">
                  {mappingData.map((mapping, idx) => (
                    <div
                      key={`${mapping.source}-${mapping.target}-${idx}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/30 group text-sm"
                    >
                      <code className="text-xs font-mono text-primary flex-1 truncate">{mapping.source}</code>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      <code className="text-xs font-mono text-success flex-1 truncate">{mapping.target}</code>
                      <button
                        onClick={() => removeMapping(mapping.source, mapping.target)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded shrink-0"
                        title="Remove mapping"
                      >
                        <Unlink className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

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
                  disabled={saving || loading || !!invoiceError || !!metadataError || !effectiveErp}
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
            firsLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mr-2" />
                    <span className="text-muted-foreground">Loading NRS dictionary fields...</span>
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
