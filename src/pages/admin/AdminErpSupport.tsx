'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileJson, Save, Loader2, Edit, Settings, Calendar, Clock, ArrowLeft, Server, Plus } from 'lucide-react';
import { getAdminApiClient } from '@/lib/api/client';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useEffect, useState, useRef } from 'react';
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
import { extractJsonWithMetadata } from '@/lib/schema/firs-extractor';
import { DataTable, Column, FilterOption, StatusBadge } from '@/components/shared';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

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

/**
 * Supported Schema Types/Sources
 */
export enum SchemaSourceType {
  // ERP Systems
  SAP = 'SAP',
  ORACLE = 'ORACLE',
  ZOHO = 'ZOHO',
  QUICKBOOKS = 'QUICKBOOKS',
  XERO = 'XERO',
  SAGE = 'SAGE',
  DYNAMICS = 'DYNAMICS',
  NETSUITE = 'NETSUITE',
  ODOO = 'ODOO',
  FRESHBOOKS = 'FRESHBOOKS',
  WAVE = 'WAVE',
  // Standards
  FIRS_UBL = 'FIRS_UBL',
  PEPPOL_BIS = 'PEPPOL_BIS',
  UBL_2_1 = 'UBL_2_1',
  // Custom
  CUSTOM = 'CUSTOM',
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

// Common ERP types
const ERP_TYPES =  Object.values(SchemaSourceType);


export default function AdminErpSupport() {
  const api = getAdminApiClient();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erpList, setErpList] = useState<ErpListItem[]>([]);
  const [selectedErp, setSelectedErp] = useState<string>('');
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
  const invoiceEditorRef = useRef<any>(null);
  const metadataEditorRef = useRef<any>(null);
  const payloadEditorRef = useRef<any>(null);

  const erpFilters: FilterOption[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
     /*    { value: 'all', label: 'All Statuses' }, */
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
          // Extract status from metadata if present
          if (data.metadata.status) {
            setStatus(data.metadata.status as SchemaStatus);
          } else if (data.status) {
            setStatus(data.status as SchemaStatus);
          } else {
            setStatus(SchemaStatus.ACTIVE);
          }
        } else {
          setMetadataJson('{}');
          // Set status from data.status if available
          if (data.status) {
            setStatus(data.status as SchemaStatus);
          } else {
            setStatus(SchemaStatus.ACTIVE);
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
    }
  }, [pathname]);

  useEffect(() => {
    if (selectedErp && showConfig) {
      fetchErpSupport(selectedErp);
      setIsEditing(true);
    }
  }, [selectedErp, showConfig]);

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
    if (!selectedErp) {
      toast.error('Please select an ERP type');
      return;
    }

    // Validate both JSONs
    const invoiceValidation = validateJson(invoiceJson);
    const metadataValidation = validateJson(metadataJson);

    if (!invoiceValidation.valid) {
      toast.error(`Invoice JSON is invalid: ${invoiceValidation.error}`);
      setInvoiceError(invoiceValidation.error || 'Invalid JSON');
      return;
    }

    if (!metadataValidation.valid) {
      toast.error(`Metadata JSON is invalid: ${metadataValidation.error}`);
      setMetadataError(metadataValidation.error || 'Invalid JSON');
      return;
    }

    setSaving(true);
    try {
      const invoiceData = JSON.parse(invoiceJson);
      const metadataData = JSON.parse(metadataJson);

      // Include status in metadata if not already present
      const metadataWithStatus = {
        ...metadataData,
        status: status,
      };

      const response = await api.v1.admin.config['supported-erps'].post({
        erp: selectedErp as any,
        invoice: invoiceData,
        metadata: metadataWithStatus,
      });

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Failed to save ERP support';
        toast.error(errorMessage);
      } else if (response.data?.data) {
        toast.success('ERP support saved successfully');
        await fetchErpList();
        await fetchErpSupport(selectedErp);
        setShowConfig(false);
        setIsEditing(false);
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
    setShowConfig(true);
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setSelectedErp('');
    setCurrentErp(null);
    setInvoiceJson('{}');
    setMetadataJson('{}');
    setStatus(SchemaStatus.DRAFT);
    setInvoiceError(null);
    setMetadataError(null);
    setShowConfig(true);
    setIsEditing(false);
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
    setInvoiceError(null);
    setMetadataError(null);
  };

  const handleProcessPayload = () => {
    try {
      const { invoice, metadata } = extractJsonWithMetadata(rawPayloadJson);
      
      if (!invoice || Object.keys(invoice).length === 0) {
        toast.warning('No invoice found in payload. Please ensure the payload contains a valid invoice object.');
        setPayloadError('No invoice object found in payload');
        return;
      }

      // Populate the editors
      setInvoiceJson(JSON.stringify(invoice, null, 2));
      setMetadataJson(JSON.stringify(metadata, null, 2));
      setInvoiceError(null);
      setMetadataError(null);
      setPayloadError(null);

      // Close modal
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

  // Process Modal Component
  const ProcessModal = () => (
    <Dialog open={showProcessModal} onOpenChange={setShowProcessModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
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
                    ? `Edit ERP Support - ${selectedErp}`
                    : 'Add New ERP Support'
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleCancel}
                variant="outline"
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving || loading || !!invoiceError || !!metadataError || !selectedErp}
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
            </div>
          </div>

          {/* ERP Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select ERP Type</CardTitle>
              <CardDescription>
                Choose the ERP system you want to configure
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                      {erp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {/* JSON Editors */}
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
            <p className="font-medium">{erp.source_type}</p>
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
    // Client-side sorting
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

  // Filter and search data
  const filteredErpList = erpList.filter((erp) => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      if (!erp.source_type.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    // Status filter
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
