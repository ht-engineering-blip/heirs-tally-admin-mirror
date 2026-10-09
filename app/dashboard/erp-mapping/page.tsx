'use client'

import {
  ConnectMapper,
  IssuesList,
  MappingRow,
  ReadOnlyMappingsList,
  ValidationIssuesTable,
} from '@/components/shared'
import { SectionLoader } from '@/components/shared/SectionLoader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { usePermissions } from '@/hooks/use-permissions'
import { useTenant } from '@/hooks/use-tenant'
import { createTenantApi } from '@/lib/api/tenant-api'
import {
  findArrayPaths,
  flattenObject,
  isFieldRequired,
  isGenuineDocumentTypeMatch,
  MAPPING_DOCUMENT_TYPES,
  parseApiValidationErrors,
  resolvePath,
} from '@/lib/erp-mapping/helpers'
import { stripJsonComments } from '@/lib/schema/firs-extractor'
import { cn } from '@/lib/utils'
import type {
  ArrayMapping,
  FieldMapping,
  GetMappingResult,
  MappingTemplate,
  MappingTestResult,
  NrsSchema,
  PickerField,
  ValidationIssue,
} from '@/types/mapping'
import Editor from '@monaco-editor/react'
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  FileJson,
  FileText,
  Link2,
  Loader2,
  Lock,
  PenLine,
  PlayCircle,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Unlink,
  Workflow,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

const MAPPING_STEPS = [
  { id: 'data', label: 'Sample Data', description: 'Target schema & sample invoice' },
  { id: 'mapping', label: 'Field Mapping', description: 'Map to NRS schema' },
] as const

type MappingStep = typeof MAPPING_STEPS[number]['id']

export default function ErpMappingPage() {
  const { tenantData, isLoading: tenantLoading } = useTenant()
  const { hasPermission } = usePermissions()
  const canConfigure = hasPermission('erp:configure')
  const api = useMemo(() => createTenantApi(), [])

  const erpSystem = (tenantData as any)?.erpSystem || ''

  const [step, setStep] = useState<MappingStep>('data')
  const [invoiceJson, setInvoiceJson] = useState('{}')
  const [invoiceError, setInvoiceError] = useState<string | null>(null)

  const [nrsSchemas, setNrsSchemas] = useState<NrsSchema[]>([])
  const [nrsLoading, setNrsLoading] = useState(false)
  const [nrsError, setNrsError] = useState<string | null>(null)
  const [selectedNrsVersion, setSelectedNrsVersion] = useState('')

  const [mappingMode, setMappingMode] = useState<'ai' | 'manual' | null>(null)
  const [generating, setGenerating] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [showCustomPrompt, setShowCustomPrompt] = useState(false)
  const [mappingData, setMappingData] = useState<FieldMapping[]>([])
  const [arrayMappings, setArrayMappings] = useState<ArrayMapping[]>([])
  const [extraTargets, setExtraTargets] = useState<string[]>([])
  const [extraItemTargets, setExtraItemTargets] = useState<string[]>([])
  const [newArraySource, setNewArraySource] = useState('')
  const [newArrayTarget, setNewArrayTarget] = useState('')
  const [expandedArrayIdx, setExpandedArrayIdx] = useState<number | null>(null)

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<MappingTestResult | null>(null)
  const [testRequestErrors, setTestRequestErrors] = useState<ValidationIssue[] | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveErrors, setSaveErrors] = useState<ValidationIssue[] | null>(null)
  const [savedOnce, setSavedOnce] = useState(false)

  // One slot per document type (Standard Invoice, Credit Note, etc.) — a
  // tenant can hold a distinct saved template per document shape for the
  // same ERP instead of one template overwriting another. null = fetched
  // and confirmed not configured yet; undefined (key absent) = not fetched.
  const [mappingsByType, setMappingsByType] = useState<Record<string, GetMappingResult | null>>({})
  const [mappingsLoading, setMappingsLoading] = useState(false)
  // null = showing the list of document types. Set to a MAPPING_DOCUMENT_TYPES
  // value when the user drills into one.
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null)
  // true = showing the read-only summary of the selected type's active
  // template; false = showing the edit wizard.
  const [viewMode, setViewMode] = useState(false)

  const invoiceEditorRef = useRef<any>(null)

  const selectedDocTypeLabel = MAPPING_DOCUMENT_TYPES.find((t) => t.value === selectedDocType)?.label || ''
  const activeMapping = selectedDocType ? mappingsByType[selectedDocType] : undefined

  // Prefills the mapping editor from the currently-active template — the
  // tenant's own saved override if one exists, otherwise the platform
  // default for this ERP. Also prefills the sample invoice saved alongside
  // it, when present (confirmed live on GET /mapping/:erp — absent only on
  // older/global templates saved before the backend returned it).
  const applyTemplate = (result: GetMappingResult) => {
    const { template } = result
    setSelectedNrsVersion(template.nrs_schema_version || '')
    setMappingData(template.field_mappings || [])
    setArrayMappings(template.array_mappings || [])
    setMappingMode((template.field_mappings || []).length > 0 ? 'manual' : null)
    if (result.sample_invoice && Object.keys(result.sample_invoice).length > 0) {
      setInvoiceJson(JSON.stringify(result.sample_invoice, null, 2))
    }
  }

  // Resets the wizard to a blank slate — used when drilling into a document
  // type that has no saved template yet.
  const resetWizardState = () => {
    setInvoiceJson('{}')
    setInvoiceError(null)
    setSelectedNrsVersion('')
    setMappingMode(null)
    setMappingData([])
    setArrayMappings([])
    setExtraTargets([])
    setExtraItemTargets([])
    setTestResult(null)
    setTestRequestErrors(null)
    setSaveErrors(null)
  }

  useEffect(() => {
    if (!canConfigure || !erpSystem) return
    let cancelled = false
    setMappingsLoading(true)
    Promise.all(
      MAPPING_DOCUMENT_TYPES.map(async (t) => {
        try {
          const response: any = await api.getMapping(erpSystem, t.value)
          if (response.error) {
            if ((response.error as any)?.value?.statusCode !== 404) {
              toast.error(`Failed to load ${t.label} mapping: ${(response.error as any)?.value?.error || 'Unknown error'}`)
            }
            return [t.value, null] as const
          }
          const result: GetMappingResult = response.data?.data
          return [t.value, isGenuineDocumentTypeMatch(result, t.value) ? result : null] as const
        } catch (error: any) {
          // One type's network failure shouldn't block the other 5 from loading.
          toast.error(`Failed to load ${t.label} mapping: ${error?.message || 'Network error'}`)
          return [t.value, null] as const
        }
      })
    ).then((entries) => {
      if (cancelled) return
      setMappingsByType(Object.fromEntries(entries))
    }).finally(() => {
      if (!cancelled) setMappingsLoading(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canConfigure, erpSystem])

  // Drills into one document type's mapping. "view" shows its read-only
  // summary (only meaningful when a template already exists — falls back to
  // the wizard otherwise, since there's nothing to view yet); "edit" goes
  // straight into the wizard, prefilled when a template exists. Resets
  // save/test state AND any in-progress UI state (AI context, expanded
  // array card, array-mapping draft inputs) left over from a previously-
  // viewed type — none of it is meaningful once the document type changes.
  const handleSelectDocType = (type: string, mode: 'view' | 'edit' = 'edit') => {
    const existing = mappingsByType[type]
    setSelectedDocType(type)
    setSavedOnce(false)
    setCustomPrompt('')
    setShowCustomPrompt(false)
    setExpandedArrayIdx(null)
    setNewArraySource('')
    setNewArrayTarget('')
    if (existing) {
      applyTemplate(existing)
      setStep('data')
      setViewMode(mode === 'view')
    } else {
      resetWizardState()
      setStep('data')
      setViewMode(false)
    }
  }

  // Returns to the list of document types.
  const handleBackToList = () => {
    setSelectedDocType(null)
    setTestResult(null)
    setTestRequestErrors(null)
    setSaveErrors(null)
  }

  // Discards any in-progress edits and returns to the read-only summary of
  // the selected type's active template — used by "Cancel" while editing.
  const handleBackToSummary = () => {
    if (activeMapping) applyTemplate(activeMapping)
    setTestResult(null)
    setTestRequestErrors(null)
    setSaveErrors(null)
    setStep('data')
    setViewMode(true)
  }

  const fetchNrsSchemas = async () => {
    setNrsLoading(true)
    setNrsError(null)
    try {
      const response = await api.getNrsSchemas()
      if (response.error) {
        setNrsError((response.error as any)?.value?.error || 'Failed to load NRS schemas')
        setNrsSchemas([])
      } else {
        const data = (response.data as any)?.data ?? response.data ?? []
        let schemas: NrsSchema[] = []
        if (Array.isArray(data)) {
          schemas = data
        } else if (data && typeof data === 'object') {
          schemas = Object.entries(data).map(([key, value]: [string, any]) => ({
            ...value,
            version: value?.version || key,
          }))
        }
        setNrsSchemas(schemas)
      }
    } catch (error: any) {
      setNrsError(error?.message || 'Failed to load NRS schemas')
      setNrsSchemas([])
    } finally {
      setNrsLoading(false)
    }
  }

  useEffect(() => {
    if (canConfigure) fetchNrsSchemas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canConfigure])

  const validateJson = (jsonString: string): { valid: boolean; error?: string } => {
    try {
      JSON.parse(stripJsonComments(jsonString))
      return { valid: true }
    } catch (error: any) {
      return { valid: false, error: error.message }
    }
  }

  const handleInvoiceChange = (value: string | undefined) => {
    if (value === undefined) return
    setInvoiceJson(value)
    const validation = validateJson(value)
    setInvoiceError(validation.valid ? null : validation.error || 'Invalid JSON')
  }

  const parsedSampleInvoice = useMemo(() => {
    try {
      return JSON.parse(stripJsonComments(invoiceJson))
    } catch {
      return null
    }
  }, [invoiceJson])

  const erpSourceFields = useMemo(() => flattenObject(parsedSampleInvoice), [parsedSampleInvoice])
  const topSourceFields = useMemo(() => erpSourceFields.filter((f) => !f.key.includes('[*]')), [erpSourceFields])

  const selectedSchema = useMemo(
    () => nrsSchemas.find((s) => s.version === selectedNrsVersion) || null,
    [nrsSchemas, selectedNrsVersion]
  )

  const topTargetFields = useMemo(() => {
    const schemaFields = (selectedSchema?.fields || []).filter((f) => !f.field_path.includes('[*]'))
    const known = schemaFields.map((f) => ({ key: f.field_path, type: f.data_type, required: isFieldRequired(f) }))
    const knownKeys = new Set(known.map((k) => k.key))
    const extras = extraTargets.filter((f) => !knownKeys.has(f)).map((f) => ({ key: f, required: false }))
    return [...known, ...extras]
  }, [selectedSchema, extraTargets])

  // Once the prefilled template AND its schema are both loaded, backfill any
  // mapped target paths the schema doesn't know about (e.g. a custom path
  // added by whoever last saved this template) — same logic handleGenerate
  // uses for a freshly AI-generated template.
  useEffect(() => {
    if (!activeMapping || !selectedSchema) return
    const { field_mappings = [], array_mappings = [] } = activeMapping.template

    const reqFields = new Set(
      (selectedSchema.fields || []).filter((f) => !f.field_path.includes('[*]') && isFieldRequired(f)).map((f) => f.field_path)
    )
    setExtraTargets(Array.from(new Set(field_mappings.map((m) => m.target).filter((t) => !reqFields.has(t)))))

    const reqItemFieldsByArray = new Set(
      array_mappings.flatMap((am) => {
        const prefix = `${am.target_array_path}[*].`
        return (selectedSchema.fields || [])
          .filter((f) => f.field_path.startsWith(prefix) && isFieldRequired(f))
          .map((f) => f.field_path.slice(prefix.length))
      })
    )
    setExtraItemTargets(
      Array.from(
        new Set(array_mappings.flatMap((am) => am.item_mappings.map((m) => m.target)).filter((t) => !reqItemFieldsByArray.has(t)))
      )
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMapping, selectedSchema])

  const getItemTargetFields = (targetArrayPath: string): PickerField[] => {
    if (!selectedSchema || !targetArrayPath) return []
    const prefix = `${targetArrayPath}[*].`
    const schemaFields = (selectedSchema.fields || []).filter((f) => f.field_path.startsWith(prefix))
    const known = schemaFields.map((f) => ({
      key: f.field_path.slice(prefix.length),
      type: f.data_type,
      required: isFieldRequired(f),
    }))
    const knownKeys = new Set(known.map((k) => k.key))
    const extras = extraItemTargets.filter((f) => !knownKeys.has(f)).map((f) => ({ key: f, required: false }))
    return [...known, ...extras]
  }

  const arraySourcePaths = useMemo(() => findArrayPaths(parsedSampleInvoice), [parsedSampleInvoice])

  const getItemSourceFields = (sourceArrayPath: string): PickerField[] => {
    const arr = resolvePath(parsedSampleInvoice, sourceArrayPath)
    if (!Array.isArray(arr) || arr.length === 0 || typeof arr[0] !== 'object' || arr[0] === null) return []
    return flattenObject(arr[0])
  }

  const addFieldMapping = (source: string, target: string) => {
    setMappingData((prev) => {
      if (prev.some((m) => m.source === source && m.target === target)) return prev
      const schemaField = (selectedSchema?.fields || []).find((f) => f.field_path === target)
      const required = schemaField ? isFieldRequired(schemaField) : false
      return [...prev, { source, target, required }]
    })
  }
  const removeFieldMappingBySource = (source: string) => setMappingData((prev) => prev.filter((m) => m.source !== source))
  const removeFieldMappingByTarget = (target: string) => setMappingData((prev) => prev.filter((m) => m.target !== target))
  const removeFieldMappingAt = (index: number) => setMappingData((prev) => prev.filter((_, i) => i !== index))
  const updateFieldMapping = (index: number, patch: Partial<FieldMapping>) =>
    setMappingData((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)))

  const addArrayMapping = () => {
    if (!newArraySource.trim() || !newArrayTarget.trim()) return
    setArrayMappings((prev) => [
      ...prev,
      { source_array_path: newArraySource.trim(), target_array_path: newArrayTarget.trim(), item_mappings: [] },
    ])
    setNewArraySource('')
    setNewArrayTarget('')
  }
  const removeArrayMapping = (idx: number) => setArrayMappings((prev) => prev.filter((_, i) => i !== idx))

  const addItemMapping = (arrIdx: number, source: string, target: string) => {
    setArrayMappings((prev) =>
      prev.map((am, i) => {
        if (i !== arrIdx) return am
        if (am.item_mappings.some((m) => m.source === source && m.target === target)) return am
        const fullPath = `${am.target_array_path}[*].${target}`
        const schemaField = (selectedSchema?.fields || []).find((f) => f.field_path === fullPath)
        const required = schemaField ? isFieldRequired(schemaField) : false
        return { ...am, item_mappings: [...am.item_mappings, { source, target, required }] }
      })
    )
  }
  const removeItemMappingBySource = (arrIdx: number, source: string) =>
    setArrayMappings((prev) =>
      prev.map((am, i) => (i === arrIdx ? { ...am, item_mappings: am.item_mappings.filter((m) => m.source !== source) } : am))
    )
  const removeItemMappingByTarget = (arrIdx: number, target: string) =>
    setArrayMappings((prev) =>
      prev.map((am, i) => (i === arrIdx ? { ...am, item_mappings: am.item_mappings.filter((m) => m.target !== target) } : am))
    )
  const removeItemMappingAt = (arrIdx: number, itemIdx: number) =>
    setArrayMappings((prev) =>
      prev.map((am, i) => (i === arrIdx ? { ...am, item_mappings: am.item_mappings.filter((_, j) => j !== itemIdx) } : am))
    )
  const updateItemMapping = (arrIdx: number, itemIdx: number, patch: Partial<FieldMapping>) =>
    setArrayMappings((prev) =>
      prev.map((am, i) =>
        i === arrIdx ? { ...am, item_mappings: am.item_mappings.map((m, j) => (j === itemIdx ? { ...m, ...patch } : m)) } : am
      )
    )

  const handleGenerate = async () => {
    if (!parsedSampleInvoice) return
    setGenerating(true)
    try {
      const response = await api.generateMapping({
        erp: erpSystem,
        sample_invoice: parsedSampleInvoice,
        nrs_version: selectedNrsVersion,
        ...(customPrompt.trim() ? { custom_prompt: customPrompt.trim() } : {}),
        ...(selectedDocType ? { document_type: selectedDocType } : {}),
      })
      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to generate mapping template')
        return
      }
      const template: MappingTemplate = (response.data as any)?.data?.template
      const nextFieldMappings = template?.field_mappings || []
      const nextArrayMappings = template?.array_mappings || []
      setMappingData(nextFieldMappings)
      setArrayMappings(nextArrayMappings)

      const reqFields = new Set(
        (selectedSchema?.fields || []).filter((f) => !f.field_path.includes('[*]') && isFieldRequired(f)).map((f) => f.field_path)
      )
      setExtraTargets(Array.from(new Set(nextFieldMappings.map((m) => m.target).filter((t) => !reqFields.has(t)))))

      const reqItemFieldsByArray = new Set(
        nextArrayMappings.flatMap((am) => {
          const prefix = `${am.target_array_path}[*].`
          return (selectedSchema?.fields || [])
            .filter((f) => f.field_path.startsWith(prefix) && isFieldRequired(f))
            .map((f) => f.field_path.slice(prefix.length))
        })
      )
      setExtraItemTargets(
        Array.from(
          new Set(
            nextArrayMappings.flatMap((am) => am.item_mappings.map((m) => m.target)).filter((t) => !reqItemFieldsByArray.has(t))
          )
        )
      )

      toast.success('AI-generated mapping template ready — review and adjust as needed')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate mapping template')
    } finally {
      setGenerating(false)
    }
  }

  const handleTest = async () => {
    if (!parsedSampleInvoice) return
    setTesting(true)
    setTestResult(null)
    setTestRequestErrors(null)
    try {
      const template: MappingTemplate = {
        erp_source: erpSystem,
        nrs_schema_version: selectedNrsVersion,
        field_mappings: mappingData,
        array_mappings: arrayMappings,
      }
      const response = await api.testMapping({ sample_invoice: parsedSampleInvoice, template })
      if (response.error) {
        const errorValue = (response.error as any)?.value
        const errors = parseApiValidationErrors(errorValue)
        if (errors.length > 0) {
          setTestRequestErrors(errors)
          toast.error(errorValue?.details?.message || errorValue?.error || 'Mapping test failed')
        } else {
          toast.error(errorValue?.error || 'Mapping test failed')
        }
        return
      }
      const result: MappingTestResult = (response.data as any)?.data ?? response.data
      setTestResult(result)
    } catch (error: any) {
      toast.error(error?.message || 'Mapping test failed')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!erpSystem) {
      toast.error('No ERP system configured on this account yet')
      return
    }
    if (!selectedNrsVersion) {
      toast.error('Select an NRS target schema first')
      setStep('data')
      return
    }
    const invoiceValidation = validateJson(invoiceJson)
    if (!invoiceValidation.valid) {
      toast.error(`Sample invoice JSON is invalid: ${invoiceValidation.error}`)
      setInvoiceError(invoiceValidation.error || 'Invalid JSON')
      setStep('data')
      return
    }
    if (mappingData.length === 0) {
      toast.error('Add at least one field mapping first')
      return
    }

    setSaving(true)
    setSaveErrors(null)
    try {
      const template: MappingTemplate = {
        erp_source: erpSystem,
        nrs_schema_version: selectedNrsVersion,
        field_mappings: mappingData,
        array_mappings: arrayMappings,
      }
      const response = await api.saveMapping({
        erp: erpSystem,
        sample_invoice: parsedSampleInvoice,
        template,
        ...(selectedDocType ? { document_type: selectedDocType } : {}),
      })
      if (response.error) {
        const errorValue = (response.error as any)?.value
        const errors = parseApiValidationErrors(errorValue)
        if (errors.length > 0) {
          setSaveErrors(errors)
          toast.error(errorValue?.details?.message || 'Mapping failed validation — see errors below')
        } else {
          toast.error(errorValue?.error || 'Failed to save mapping template')
        }
        return
      }
      setSaveErrors(null)
      setSavedOnce(true)
      if (selectedDocType) {
        setMappingsByType((prev) => ({
          ...prev,
          [selectedDocType]: {
            ...(prev[selectedDocType] as GetMappingResult),
            is_custom: true,
            template,
            document_type: selectedDocType,
            sample_invoice: parsedSampleInvoice,
            updated_at: new Date().toISOString(),
          },
        }))
      }
      setViewMode(true)
      toast.success(`${selectedDocTypeLabel} mapping saved and activated`)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save mapping template')
    } finally {
      setSaving(false)
    }
  }

  // A sample invoice isn't required to proceed when there's already a loaded
  // template to review/adjust (Edit Mapping never gets one back from the
  // GET endpoint) — Step 2 itself prompts for one before allowing new
  // connections, a test, or a save.
  const canProceedFromData =
    !invoiceError && !!selectedNrsVersion && (invoiceJson !== '{}' || mappingData.length > 0 || arrayMappings.length > 0)

  if (tenantLoading) {
    return <SectionLoader message="Loading ERP mapping" />
  }

  if (!canConfigure) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lock className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">You don't have access to ERP Mapping</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Only the business owner or a team member with the Admin role can configure ERP field mapping.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (mappingsLoading && !selectedDocType) {
    return <SectionLoader message="Loading ERP mapping" />
  }

  // List view — one card per document type, showing whether each has its
  // own saved mapping (or is falling back to the platform default) before
  // drilling into any single one.
  if (!selectedDocType) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="page-title flex items-center gap-3">
                <Workflow className="w-6 h-6" />
                ERP Mapping
              </h1>
              <p className="page-subtitle">Map your ERP's invoice fields to the NRS schema, per document type</p>
            </div>
          </div>
          {erpSystem && <Badge variant="outline">{erpSystem}</Badge>}
        </div>

        {!erpSystem && (
          <Alert variant="destructive">
            <AlertTitle>No ERP system on file</AlertTitle>
            <AlertDescription>
              Your account doesn't have an ERP system configured yet. Set it up under Profile before configuring field mapping.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MAPPING_DOCUMENT_TYPES.map((t) => {
            const result = mappingsByType[t.value]
            const configured = !!result
            return (
              <Card key={t.value}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      {t.label}
                    </CardTitle>
                    {configured ? (
                      <Badge className={result!.is_custom ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                        {result!.is_custom ? 'Your mapping' : 'Platform default'}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not configured</Badge>
                    )}
                  </div>
                  <CardDescription>
                    {configured
                      ? `${result!.template.field_mappings?.length || 0} field mappings${result!.updated_at ? ` · updated ${new Date(result!.updated_at).toLocaleDateString()}` : ''}`
                      : 'No mapping saved for this document type yet'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {configured && (
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={() => handleSelectDocType(t.value, 'view')}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Mapping
                    </Button>
                  )}
                  <Button
                    variant={configured ? 'outline' : 'default'}
                    className="rounded-full"
                    onClick={() => handleSelectDocType(t.value, 'edit')}
                  >
                    {configured ? (
                      <>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Mapping
                      </>
                    ) : (
                      'Configure'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // View mode — read-only summary of the selected document type's active
  // template (your own saved override, or the platform default). This is
  // also where a successful save lands, so the page visibly changes state
  // instead of just sitting on the same form.
  if (viewMode && activeMapping) {
    const { template, is_custom, updated_at } = activeMapping
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBackToList} className="rounded-full">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="page-title flex items-center gap-3">
                <Workflow className="w-6 h-6" />
                {selectedDocTypeLabel}
              </h1>
              <p className="page-subtitle">Map your ERP's invoice fields to the NRS schema</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {erpSystem && <Badge variant="outline">{erpSystem}</Badge>}
            <Button
              onClick={() => {
                setStep('data')
                setViewMode(false)
              }}
              className="rounded-full"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Mapping
            </Button>
          </div>
        </div>

        <Alert className={savedOnce ? 'border-success/30 bg-success/5' : undefined}>
          <CheckCircle2 className={cn('h-4 w-4', savedOnce && 'text-success')} />
          <AlertTitle>
            {savedOnce ? 'Mapping active' : is_custom ? 'Using your saved mapping' : 'Using the platform default template'}
          </AlertTitle>
          <AlertDescription>
            {savedOnce
              ? 'Your last save is live. Click Edit Mapping to keep adjusting — each save replaces the active mapping for this document type.'
              : is_custom
                ? `This is the mapping you last saved for ${selectedDocTypeLabel} on ${erpSystem}.${updated_at ? ` Last updated ${new Date(updated_at).toLocaleString()}.` : ''}`
                : `No ${selectedDocTypeLabel} mapping saved yet for ${erpSystem} — this is the platform's default template. Edit and save to create your own override.`}
          </AlertDescription>
        </Alert>

        <ReadOnlyMappingsList mappingData={template.field_mappings || []} arrayMappings={template.array_mappings || []} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBackToList} className="rounded-full">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="page-title flex items-center gap-3">
              <Workflow className="w-6 h-6" />
              {selectedDocTypeLabel}
            </h1>
            <p className="page-subtitle">Map your ERP's invoice fields to the NRS schema</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {erpSystem && <Badge variant="outline">{erpSystem}</Badge>}
          {activeMapping && (
            <Button onClick={handleBackToSummary} variant="ghost" className="rounded-full">
              Cancel
            </Button>
          )}
          {step !== 'data' && (
            <Button onClick={() => setStep('data')} variant="outline" className="rounded-full">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
          )}
          {step === 'data' ? (
            <Button onClick={() => setStep('mapping')} disabled={!canProceedFromData} className="rounded-full">
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saving || !erpSystem || !selectedNrsVersion || mappingData.length === 0}
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
                  Save & Activate
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {!erpSystem && (
        <Alert variant="destructive">
          <AlertTitle>No ERP system on file</AlertTitle>
          <AlertDescription>
            Your account doesn't have an ERP system configured yet. Set it up under Profile before configuring field mapping.
          </AlertDescription>
        </Alert>
      )}

      {activeMapping && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>{activeMapping.is_custom ? 'Editing your saved mapping' : 'Editing the platform default template'}</AlertTitle>
          <AlertDescription>
            {invoiceJson === '{}'
              ? 'Paste a sample invoice below to test or adjust it further — the mapping itself is already prefilled.'
              : 'The sample invoice and mapping are both prefilled below — adjust and re-test as needed.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Stepper */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {MAPPING_STEPS.map((s, idx) => {
          const currentIdx = MAPPING_STEPS.findIndex((x) => x.id === step)
          const isActive = s.id === step
          const isCompleted = idx < currentIdx
          return (
            <div key={s.id} className="flex items-center gap-2 sm:flex-1">
              <button
                onClick={() => {
                  if (isCompleted || isActive) setStep(s.id)
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
                  <p className="text-sm font-medium truncate">{s.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                </div>
              </button>
              {idx < MAPPING_STEPS.length - 1 && (
                <ChevronRight className="hidden sm:block w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </div>
          )
        })}
      </div>

      {/* Step 1: Sample Data */}
      {step === 'data' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>NRS Target Schema</CardTitle>
              <CardDescription>Select the versioned NRS schema your invoices will map to</CardDescription>
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
                  <span>{selectedSchema.fields?.filter((f) => !f.field_path.includes('[*]') && isFieldRequired(f)).length || 0} required fields</span>
                  <span>{selectedSchema.fields?.filter((f) => f.field_path.includes('[*]') && isFieldRequired(f)).length || 0} required item fields</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sample Invoice</CardTitle>
              <CardDescription>Paste a sample invoice from your ERP as JSON — this drives the source fields below</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden" style={{ height: '500px' }}>
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  language="json"
                  value={invoiceJson}
                  onChange={handleInvoiceChange}
                  onMount={(editor) => { invoiceEditorRef.current = editor }}
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
              {invoiceError && <p className="text-sm text-destructive mt-2">{invoiceError}</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Field Mapping */}
      {step === 'mapping' && (
        erpSourceFields.length === 0 ? (
          mappingData.length > 0 || arrayMappings.length > 0 ? (
            // A template is already loaded (from Edit Mapping) but no sample
            // invoice came back with it this time — usually an older/global
            // template saved before the backend started returning one. Show
            // what's already there instead of hiding it behind the empty
            // state below.
            <div className="space-y-6">
              <Alert>
                <FileJson className="h-4 w-4" />
                <AlertTitle>Paste a sample invoice to test or adjust these mappings</AlertTitle>
                <AlertDescription>
                  The mappings below are already loaded, but connecting new fields, testing, or saving needs a sample invoice —
                  none was saved alongside this template, so paste one to continue.
                </AlertDescription>
              </Alert>
              <Button variant="outline" onClick={() => setStep('data')} className="rounded-full">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Sample Data
              </Button>
              <ReadOnlyMappingsList mappingData={mappingData} arrayMappings={arrayMappings} />
            </div>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Link2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">No source fields available</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Go back to Sample Data and paste your invoice JSON to generate source fields for mapping.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setStep('data')} className="rounded-full mt-4">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back to Sample Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        ) : !selectedSchema ? (
          <Card>
            <CardContent className="pt-12 pb-12">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <FileJson className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">No NRS schema selected</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Go back to Sample Data and select an NRS target schema version to enable field mapping.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setStep('data')} className="rounded-full mt-4">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back to Sample Data
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {saveErrors && saveErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Save Blocked — Validation Errors ({saveErrors.length})</AlertTitle>
                <AlertDescription>
                  <ValidationIssuesTable issues={saveErrors} />
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
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <Collapsible open={showCustomPrompt} onOpenChange={setShowCustomPrompt}>
                    <CollapsibleTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground">
                        <ChevronRight className={cn('w-3.5 h-3.5 mr-1 transition-transform', showCustomPrompt && 'rotate-90')} />
                        Add Context for AI Autogenerate (optional)
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-2">
                      <Textarea
                        placeholder="e.g. &quot;HSN codes live under item.tax_code&quot;, &quot;ignore the deprecated legacy_ref field&quot;, &quot;dates are DD/MM/YYYY&quot;"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        className="min-h-[80px] text-sm"
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground">
                        Anything the AI can't infer from the sample invoice alone — field quirks, formats, or fields to skip.
                        Drag the bottom-right corner to resize.
                      </p>
                    </CollapsibleContent>
                  </Collapsible>
                  <div className="flex justify-end">
                    <Button onClick={handleGenerate} disabled={generating} className="rounded-full">
                      {generating ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" />Generate with AI</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mapping stats */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>{topSourceFields.length} source fields</span>
              <span>-</span>
              <span>{topTargetFields.length} target fields</span>
              <span>-</span>
              <Badge variant="secondary">{mappingData.length} mappings</Badge>
              {mappingData.length > 0 && (
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setMappingData([])}>
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
              sourceLabel={`${erpSystem} Fields`}
              targetLabel="NRS Fields"
              onAddCustomTarget={(path) => setExtraTargets((prev) => (prev.includes(path) ? prev : [...prev, path]))}
            />

            {mappingData.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Active Mappings ({mappingData.length})</CardTitle>
                  <CardDescription>Expand a mapping to configure transform, fallback sources, or a default value</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[320px]">
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
                      const itemSourceFields = getItemSourceFields(am.source_array_path)
                      const isExpanded = expandedArrayIdx === arrIdx
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
                                targetFields={getItemTargetFields(am.target_array_path)}
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
                      )
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
              {testRequestErrors && testRequestErrors.length > 0 && (
                <CardContent>
                  <Alert variant="destructive">
                    <AlertTitle>Request Rejected — Invalid Mapping Data ({testRequestErrors.length})</AlertTitle>
                    <AlertDescription>
                      <p className="text-sm mb-1">
                        The mapping couldn't even be tested — some fields aren't shaped correctly. Check for mappings with a missing/empty source or target.
                      </p>
                      <ValidationIssuesTable issues={testRequestErrors} />
                    </AlertDescription>
                  </Alert>
                </CardContent>
              )}
              {testResult && (
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className={cn('status-badge', testResult.success ? 'status-active' : 'status-error')}>
                      {testResult.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 mr-1 inline" />
                      )}
                      {testResult.success ? 'Valid' : 'Invalid'}
                    </span>
                    <span className="text-sm text-muted-foreground">Executed in {testResult.executionTimeMs}ms</span>
                    <span className="text-sm text-muted-foreground">{testResult.appliedRulesCount} rules applied</span>
                  </div>

                  {testResult.healedFields && testResult.healedFields.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-xs text-muted-foreground mr-1">Auto-healed:</span>
                      {testResult.healedFields.map((field, idx) => (
                        <Badge key={`${field}-${idx}`} variant="secondary" className="text-[10px]">{field}</Badge>
                      ))}
                    </div>
                  )}

                  {testResult.missingRequiredFields && testResult.missingRequiredFields.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTitle>Missing Required Fields ({testResult.missingRequiredFields.length})</AlertTitle>
                      <AlertDescription>
                        <IssuesList items={testResult.missingRequiredFields} />
                      </AlertDescription>
                    </Alert>
                  )}

                  {!testResult.success && testResult.errors && testResult.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTitle>Validation Errors ({testResult.errors.length})</AlertTitle>
                      <AlertDescription>
                        <IssuesList items={testResult.errors} />
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
                          value={JSON.stringify(testResult.data, null, 2)}
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
        )
      )}
    </div>
  )
}
