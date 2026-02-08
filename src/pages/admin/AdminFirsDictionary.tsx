'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileJson, Save, Loader2, Edit, Settings, Calendar, Clock, ArrowLeft } from 'lucide-react';
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
import { extractJsonWithMetadata } from '@/lib/schema/firs-extractor';

interface Field {
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

interface FirsDictionary {
  _id?: string;
  schema_id: string;
  name: string;
  description: string;
  source_type: string;
  status: string;
  fields: Field[];
  metadata: any;
  created_by?: string;
  mapping_rules?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminFirsDictionary() {
  const api = getAdminApiClient();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dictionary, setDictionary] = useState<FirsDictionary | null>(null);
  const [fieldsJson, setFieldsJson] = useState<string>('[]');
  const [metadataJson, setMetadataJson] = useState<string>('{}');
  const [fieldsError, setFieldsError] = useState<string | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [rawPayloadJson, setRawPayloadJson] = useState<string>('{}');
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const fieldsEditorRef = useRef<any>(null);
  const metadataEditorRef = useRef<any>(null);
  const payloadEditorRef = useRef<any>(null);

  const fetchFirsDictionary = async () => {
    setLoading(true);
    try {
      const response = await api.v1.admin.config['firs-dictionary'].get();
      
      if (response.error) {
        // Check if it's a 404 or not found error
        const errorValue = (response.error as any)?.value;
        if (errorValue?.statusCode === 404 || errorValue?.error?.includes('not found') || errorValue?.error?.includes('Not found')) {
          // Dictionary doesn't exist - this is expected
          setDictionary(null);
          setFieldsJson('[]');
          setMetadataJson('{}');
          setShowConfig(false);
          setIsEditing(false);
        } else {
          const errorMessage = errorValue?.error || 'Failed to fetch FIRS dictionary';
          toast.error(errorMessage);
          setDictionary(null);
        }
      } else if (response.data?.data) {
        const data = response.data.data as FirsDictionary;
        setDictionary(data);
        
        // Populate editors with existing data
        if (data.fields) {
          setFieldsJson(JSON.stringify(data.fields, null, 2));
        } else {
          setFieldsJson('[]');
        }
        
        if (data.metadata) {
          setMetadataJson(JSON.stringify(data.metadata, null, 2));
        } else {
          setMetadataJson('{}');
        }
        
        setShowConfig(false);
        setIsEditing(false);
      } else {
        // No dictionary exists yet
        setDictionary(null);
        setFieldsJson('[]');
        setMetadataJson('{}');
        setShowConfig(false);
        setIsEditing(false);
      }
    } catch (error: any) {
      // If it's a 404, dictionary doesn't exist
      if (error?.status === 404 || error?.message?.includes('404')) {
        setDictionary(null);
        setFieldsJson('[]');
        setMetadataJson('{}');
        setShowConfig(false);
        setIsEditing(false);
      } else {
        toast.error(error?.message || 'Failed to fetch FIRS dictionary');
        setDictionary(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const validateJson = (jsonString: string): { valid: boolean; error?: string } => {
    try {
      JSON.parse(jsonString);
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  };

  const handleFieldsChange = (value: string | undefined) => {
    if (value !== undefined) {
      setFieldsJson(value);
      const validation = validateJson(value);
      if (validation.valid) {
        setFieldsError(null);
      } else {
        setFieldsError(validation.error || 'Invalid JSON');
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
    // Validate both JSONs
    const fieldsValidation = validateJson(fieldsJson);
    const metadataValidation = validateJson(metadataJson);

    if (!fieldsValidation.valid) {
      toast.error(`Fields JSON is invalid: ${fieldsValidation.error}`);
      setFieldsError(fieldsValidation.error || 'Invalid JSON');
      return;
    }

    if (!metadataValidation.valid) {
      toast.error(`Metadata JSON is invalid: ${metadataValidation.error}`);
      setMetadataError(metadataValidation.error || 'Invalid JSON');
      return;
    }

    setSaving(true);
    try {
      const fieldsData = JSON.parse(fieldsJson);
      const metadataData = JSON.parse(metadataJson);

      const response = await api.v1.admin.config['firs-dictionary'].put({
        invoice: fieldsData,
        metadata: metadataData,
      });

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || 'Failed to save FIRS dictionary';
        toast.error(errorMessage);
      } else if (response.data?.data) {
        console.log('response', response.data.data);
        toast.success('FIRS dictionary saved successfully');
        // Refresh the dictionary
        await fetchFirsDictionary();
        setShowConfig(false);
        setIsEditing(false);
      } else {
        toast.error('Unexpected response format');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save FIRS dictionary');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    if (dictionary) {
      // Populate editors with existing data
      if (dictionary.fields) {
        setFieldsJson(JSON.stringify(dictionary.fields, null, 2));
      }
      if (dictionary.metadata) {
        setMetadataJson(JSON.stringify(dictionary.metadata, null, 2));
      }
    }
    setShowConfig(true);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (dictionary) {
      // Restore original values
      if (dictionary.fields) {
        setFieldsJson(JSON.stringify(dictionary.fields, null, 2));
      }
      if (dictionary.metadata) {
        setMetadataJson(JSON.stringify(dictionary.metadata, null, 2));
      }
    }
    setShowConfig(false);
    setIsEditing(false);
    setFieldsError(null);
    setMetadataError(null);
  };

  useEffect(() => {
    if (pathname) {
      fetchFirsDictionary();
    }
  }, [pathname]);

  const handleEditorDidMount = (editor: any, monaco: any, type: 'fields' | 'metadata' | 'payload') => {
    if (type === 'fields') {
      fieldsEditorRef.current = editor;
    } else if (type === 'metadata') {
      metadataEditorRef.current = editor;
    } else if (type === 'payload') {
      payloadEditorRef.current = editor;
    }
  };

  const handleProcessPayload = () => {
    // Validate JSON
    //const validation = validateJson(rawPayloadJson);
    //console.log('validation', validation);
    //if (!validation.valid) {
    //  setPayloadError(validation.error || 'Invalid JSON');
    //  toast.error(`Invalid JSON: ${validation.error}`);
    //  return;
    //}

    try {
      const { invoice, metadata } = extractJsonWithMetadata(rawPayloadJson);
      console.log('payload',  { invoice, metadata });
      // Extract invoice and metadata 

      // Check if payload has fields array directly (most common case)
      if (!invoice || Object.keys(invoice).length === 0) {
        toast.warning('No invoice found in payload. Please ensure the payload contains a valid invoice object.');
        setPayloadError('No invoice object found in payload');
        return;
      }

      // Populate the editors
      setFieldsJson(JSON.stringify(invoice, null, 2));
      setMetadataJson(JSON.stringify(metadata, null, 2));
      setFieldsError(null);
      setMetadataError(null);
      setPayloadError(null);

      // Close modal and show config
      setShowProcessModal(false);
      setShowConfig(true);
      setIsEditing(false);

      toast.success(`Payload processed successfully. Extracted ${Object.keys(invoice).length} fields and ${Object.keys(metadata).length} metadata.`);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to process payload';
      setPayloadError(errorMessage);
      toast.error(`Failed to process payload: ${errorMessage}`);
    }
  };

  // Process Modal Component
  const ProcessModal = () => (
    <Dialog open={showProcessModal} onOpenChange={setShowProcessModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Process FIRS Dictionary Payload</DialogTitle>
          <DialogDescription>
            Paste the complete FIRS dictionary JSON payload. The system will automatically extract the fields and metadata.
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

  // If dictionary doesn't exist and not showing config
  if (!dictionary && !showConfig && !loading) {
    return (
      <>
        <ProcessModal />
        <div className="space-y-6 animate-fade-in">
          <div className="page-header">
            <div>
              <h1 className="page-title">FIRS Dictionary</h1>
              <p className="page-subtitle">Manage FIRS reference data and validation schemas</p>
            </div>
          </div>

        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <FileJson className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">FIRS Schema has not been configured</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Configure the FIRS UBL Invoice Schema by providing the fields and metadata structure.
                </p>
              </div>
              <Button 
                onClick={() => setShowProcessModal(true)}
                className="rounded-full mt-4"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure FIRS Schema
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </>
    );
  }

  // If showing configuration (create or edit mode)
  if (showConfig) {
    return (
      <>
        <ProcessModal />
        <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (isEditing) {
                  handleCancelEdit();
                } else {
                  // If creating, go back to default state
                  setShowConfig(false);
                  setFieldsJson('{}');
                  setMetadataJson('{}');
                  setFieldsError(null);
                  setMetadataError(null);
                }
              }}
              className="rounded-full"
              title="Back to default view"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="page-title">FIRS Dictionary</h1>
              <p className="page-subtitle">
                {isEditing 
                  ? `Edit FIRS UBL Invoice Schema - ${dictionary?.name || ''}`
                  : 'Create FIRS UBL Invoice Schema'
                }
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing && (
              <Button 
                onClick={handleCancelEdit}
                variant="outline"
                className="rounded-full"
              >
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleSave} 
              disabled={saving || loading || !!fieldsError || !!metadataError}
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
                  {isEditing ? 'Update Dictionary' : 'Create Dictionary'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* JSON Editors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fields Editor */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Schema (Fields)</CardTitle>
              <CardDescription>
                Define the invoice schema fields structure as a JSON array
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
                <Editor
                  height="100%"
                  defaultLanguage="json"
                  language="json"
                  value={fieldsJson}
                  onChange={handleFieldsChange}
                  onMount={(editor, monaco) => handleEditorDidMount(editor, monaco, 'fields')}
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
              {fieldsError && (
                <p className="text-sm text-destructive mt-2">{fieldsError}</p>
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

  // Display mode - show dictionary details and fields
  if (dictionary && !showConfig) {
    return (
      <>
        <ProcessModal />
        <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">FIRS Dictionary</h1>
            <p className="page-subtitle">{dictionary.name}</p>
          </div>
          <div className='flex gap-2'>
          <Button 
                onClick={() => setShowProcessModal(true)}
                className="rounded-full"
                variant='outline'
              >
                <Settings className="w-4 h-4 mr-2" />
               Update Schema
              </Button>
          <Button 
            onClick={handleEdit}
            className="rounded-full"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Dictionary
          </Button>
        </div>
        </div>

        {/* Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileJson className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{dictionary.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Schema ID: {dictionary.schema_id} • Source Type: {dictionary.source_type}
                  </p>
                  {dictionary.description && (
                    <p className="text-sm text-muted-foreground mt-1">{dictionary.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {dictionary.createdAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Created: {new Date(dictionary.createdAt).toLocaleString()}</span>
                      </div>
                    )}
                    {dictionary.updatedAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Updated: {new Date(dictionary.updatedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Badge className={dictionary.status === 'active' ? 'bg-success/10 text-success' : ''}>
                {dictionary.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Fields Table */}
        <Card>
          <CardHeader>
            <CardTitle>Schema Fields ({dictionary.fields?.length || 0})</CardTitle>
            <CardDescription>
              All fields defined in the FIRS UBL Invoice Schema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Field ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Field Path</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Data Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Format</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Validation Rules</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Required</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Array</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dictionary.fields && dictionary.fields.length > 0 ? (
                      dictionary.fields.map((field, index) => (
                        <tr key={field.field_id || index} className="border-t hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                              {field.field_id}
                            </code>
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                            {field.field_path}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs">
                              {field.data_type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {field.format || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground max-w-xs">
                            <div className="truncate" title={field.validation_rules}>
                              {field.validation_rules || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm max-w-md">
                            <div className="line-clamp-2" title={field.description}>
                              {field.description || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {field.is_required ? (
                              <Badge className="bg-success/10 text-success text-xs">Yes</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">No</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {field.is_array ? (
                              <Badge className="bg-primary/10 text-primary text-xs">Yes</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">No</Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                          No fields defined
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Field Details (Expandable) */}
        {dictionary.fields && dictionary.fields.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {dictionary.fields.slice(0, 6).map((field, index) => (
              <Card key={field.field_id || index} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {field.field_id}
                    </code>
                    {field.is_required && (
                      <Badge className="bg-destructive/10 text-destructive text-xs">Required</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Path:</span>{' '}
                    <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
                      {field.field_path}
                    </code>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Type:</span>{' '}
                    <Badge variant="outline" className="text-xs ml-1">
                      {field.data_type}
                    </Badge>
                  </div>
                  {field.format && (
                    <div>
                      <span className="font-medium text-muted-foreground">Format:</span>{' '}
                      <span>{field.format}</span>
                    </div>
                  )}
                  {field.validation_rules && (
                    <div>
                      <span className="font-medium text-muted-foreground">Validation:</span>{' '}
                      <span className="text-xs">{field.validation_rules}</span>
                    </div>
                  )}
                  {field.description && (
                    <div>
                      <span className="font-medium text-muted-foreground">Description:</span>{' '}
                      <p className="text-xs mt-1">{field.description}</p>
                    </div>
                  )}
                  {field.example_value !== undefined && field.example_value !== null && (
                    <div>
                      <span className="font-medium text-muted-foreground">Example:</span>{' '}
                      <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
                        {typeof field.example_value === 'object' 
                          ? JSON.stringify(field.example_value) 
                          : String(field.example_value)}
                      </code>
                    </div>
                  )}
                  {field.enum_values && field.enum_values.length > 0 && (
                    <div>
                      <span className="font-medium text-muted-foreground">Enum Values:</span>{' '}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {field.enum_values.map((val, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {String(val)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      </>
    );
  }

  // Loading state
  return (
    <>
      <ProcessModal />
      <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">FIRS Dictionary</h1>
          <p className="page-subtitle">Manage FIRS reference data and validation schemas</p>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mr-2" />
            <span className="text-muted-foreground">Loading FIRS dictionary...</span>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
