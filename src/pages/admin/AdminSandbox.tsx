'use client'

import { useState, useRef } from 'react';
import { Play, CheckCircle, XCircle, Clock, Loader2, Code2, FileCheck, Workflow } from 'lucide-react';
import { getAdminApiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Editor from '@monaco-editor/react';

// ERP Types from AdminErpSupport
enum SchemaSourceType {
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
  FIRS_UBL = 'FIRS_UBL',
  PEPPOL_BIS = 'PEPPOL_BIS',
  UBL_2_1 = 'UBL_2_1',
  CUSTOM = 'CUSTOM',
}

const ERP_OPTIONS = Object.values(SchemaSourceType).filter(
  (erp) => !erp.includes('UBL') && !erp.includes('PEPPOL') && erp !== 'CUSTOM'
);

interface TimelineStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  timestamp?: Date;
  duration?: number;
  data?: any;
  errors?: string[];
  warnings?: string[];
}

interface TestResult {
  type: 'transform' | 'validate' | 'full';
  timeline: TimelineStep[];
  result?: any;
  error?: string;
}

export default function AdminSandbox() {
  const api = getAdminApiClient();
  const [activeTab, setActiveTab] = useState<'transform' | 'validate' | 'full'>('transform');
  const [invoiceJson, setInvoiceJson] = useState<string>('{\n  "invoiceNumber": "INV-001",\n  "amount": 1000,\n  "currency": "NGN"\n}');
  const [erpType, setErpType] = useState<string>('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const editorRef = useRef<any>(null);

  const validateJson = (jsonString: string): { valid: boolean; error?: string; data?: any } => {
    try {
      const parsed = JSON.parse(jsonString);
      return { valid: true, data: parsed };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  };

  const createTimelineStep = (
    id: string,
    name: string,
    status: TimelineStep['status'] = 'pending'
  ): TimelineStep => ({
    id,
    name,
    status,
  });

  const updateTimelineStep = (
    timeline: TimelineStep[],
    stepId: string,
    updates: Partial<TimelineStep>
  ): TimelineStep[] => {
    return timeline.map(step => 
      step.id === stepId 
        ? { ...step, ...updates, timestamp: updates.timestamp || step.timestamp || new Date() }
        : step
    );
  };

  const testTransform = async () => {
    const validation = validateJson(invoiceJson);
    if (!validation.valid) {
      setInvoiceError(validation.error || 'Invalid JSON');
      toast.error('Invalid JSON format');
      return;
    }

    if (!erpType) {
      toast.error('Please select an ERP type');
      return;
    }

    setInvoiceError(null);
    setTesting(true);
    
    const timeline: TimelineStep[] = [
      createTimelineStep('1', 'Parse Invoice JSON', 'running'),
      createTimelineStep('2', 'Transform to FIRS UBL', 'pending'),
      createTimelineStep('3', 'Validate Transformation', 'pending'),
    ];

    setTestResult({ type: 'transform', timeline, result: null });

    try {
      // Step 1: Parse Invoice JSON
      await new Promise(resolve => setTimeout(resolve, 300));
      let updatedTimeline = updateTimelineStep(timeline, '1', { 
        status: 'success',
        timestamp: new Date(),
        duration: 300
      });
      setTestResult({ type: 'transform', timeline: updatedTimeline });

      // Step 2: Transform
      updatedTimeline = updateTimelineStep(updatedTimeline, '2', { status: 'running' });
      setTestResult({ type: 'transform', timeline: updatedTimeline });

      const response = await api.v1.admin.sandbox['test-transform'].post({
        invoice: validation.data,
        erpType: erpType,
      });

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || (response.error as any)?.value?.message || 'Transformation failed';
        updatedTimeline = updateTimelineStep(updatedTimeline, '2', { 
          status: 'error',
          errors: [errorMessage],
          timestamp: new Date()
        });
        updatedTimeline = updateTimelineStep(updatedTimeline, '3', { status: 'error' });
        setTestResult({ type: 'transform', timeline: updatedTimeline, error: errorMessage });
        toast.error(errorMessage);
      } else if (response.data?.data) {
        const data = response.data.data;
        updatedTimeline = updateTimelineStep(updatedTimeline, '2', { 
          status: 'success',
          data: data.transformed,
          timestamp: new Date()
        });

        // Step 3: Validate
        updatedTimeline = updateTimelineStep(updatedTimeline, '3', { status: 'running' });
        setTestResult({ type: 'transform', timeline: updatedTimeline });

        await new Promise(resolve => setTimeout(resolve, 200));
        updatedTimeline = updateTimelineStep(updatedTimeline, '3', { 
          status: data.errors && data.errors.length > 0 ? 'error' : 'success',
          errors: data.errors,
          timestamp: new Date(),
          duration: 200
        });

        setTestResult({ 
          type: 'transform', 
          timeline: updatedTimeline, 
          result: data 
        });
        toast.success('Transformation test completed');
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Transformation test failed';
      const updatedTimeline = updateTimelineStep(timeline, '2', { 
        status: 'error',
        errors: [errorMessage],
        timestamp: new Date()
      });
      setTestResult({ type: 'transform', timeline: updatedTimeline, error: errorMessage });
      toast.error(errorMessage);
    } finally {
      setTesting(false);
    }
  };

  const testValidate = async () => {
    const validation = validateJson(invoiceJson);
    if (!validation.valid) {
      setInvoiceError(validation.error || 'Invalid JSON');
      toast.error('Invalid JSON format');
      return;
    }

    setInvoiceError(null);
    setTesting(true);
    
    const timeline: TimelineStep[] = [
      createTimelineStep('1', 'Parse Invoice JSON', 'running'),
      createTimelineStep('2', 'Validate Schema', 'pending'),
      createTimelineStep('3', 'Check Business Rules', 'pending'),
      createTimelineStep('4', 'Generate Report', 'pending'),
    ];

    setTestResult({ type: 'validate', timeline, result: null });

    try {
      // Step 1: Parse
      await new Promise(resolve => setTimeout(resolve, 200));
      let updatedTimeline = updateTimelineStep(timeline, '1', { 
        status: 'success',
        timestamp: new Date(),
        duration: 200
      });
      setTestResult({ type: 'validate', timeline: updatedTimeline });

      // Step 2: Validate Schema
      updatedTimeline = updateTimelineStep(updatedTimeline, '2', { status: 'running' });
      setTestResult({ type: 'validate', timeline: updatedTimeline });

      const response = await api.v1.admin.sandbox['test-validate'].post({
        invoice: validation.data,
      });

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || (response.error as any)?.value?.message || 'Validation failed';
        updatedTimeline = updateTimelineStep(updatedTimeline, '2', { 
          status: 'error',
          errors: [errorMessage],
          timestamp: new Date()
        });
        updatedTimeline = updateTimelineStep(updatedTimeline, '3', { status: 'error' });
        updatedTimeline = updateTimelineStep(updatedTimeline, '4', { status: 'error' });
        setTestResult({ type: 'validate', timeline: updatedTimeline, error: errorMessage });
        toast.error(errorMessage);
      } else if (response.data?.data) {
        const data = response.data.data;
        updatedTimeline = updateTimelineStep(updatedTimeline, '2', { 
          status: data.valid ? 'success' : 'error',
          errors: data.errors,
          warnings: data.warnings,
          timestamp: new Date()
        });

        // Step 3: Business Rules
        updatedTimeline = updateTimelineStep(updatedTimeline, '3', { status: 'running' });
        setTestResult({ type: 'validate', timeline: updatedTimeline });
        await new Promise(resolve => setTimeout(resolve, 150));
        updatedTimeline = updateTimelineStep(updatedTimeline, '3', { 
          status: data.valid ? 'success' : 'error',
          timestamp: new Date(),
          duration: 150
        });

        // Step 4: Generate Report
        updatedTimeline = updateTimelineStep(updatedTimeline, '4', { status: 'running' });
        setTestResult({ type: 'validate', timeline: updatedTimeline });
        await new Promise(resolve => setTimeout(resolve, 100));
        updatedTimeline = updateTimelineStep(updatedTimeline, '4', { 
          status: 'success',
          timestamp: new Date(),
          duration: 100
        });

        setTestResult({ 
          type: 'validate', 
          timeline: updatedTimeline, 
          result: data 
        });
        toast.success(`Validation ${data.valid ? 'passed' : 'failed'}`);
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Validation test failed';
      const updatedTimeline = updateTimelineStep(timeline, '2', { 
        status: 'error',
        errors: [errorMessage],
        timestamp: new Date()
      });
      setTestResult({ type: 'validate', timeline: updatedTimeline, error: errorMessage });
      toast.error(errorMessage);
    } finally {
      setTesting(false);
    }
  };

  const testFullWorkflow = async () => {
    const validation = validateJson(invoiceJson);
    if (!validation.valid) {
      setInvoiceError(validation.error || 'Invalid JSON');
      toast.error('Invalid JSON format');
      return;
    }

    if (!erpType) {
      toast.error('Please select an ERP type');
      return;
    }

    setInvoiceError(null);
    setTesting(true);
    
    const timeline: TimelineStep[] = [
      createTimelineStep('1', 'Parse Invoice JSON', 'running'),
      createTimelineStep('2', 'Transform to FIRS UBL', 'pending'),
      createTimelineStep('3', 'Validate Invoice', 'pending'),
      createTimelineStep('4', 'Generate QR Code', 'pending'),
      createTimelineStep('5', 'Sign Invoice', 'pending'),
      createTimelineStep('6', 'Complete Workflow', 'pending'),
    ];

    setTestResult({ type: 'full', timeline, result: null });

    try {
      // Step 1: Parse
      await new Promise(resolve => setTimeout(resolve, 200));
      let updatedTimeline = updateTimelineStep(timeline, '1', { 
        status: 'success',
        timestamp: new Date(),
        duration: 200
      });
      setTestResult({ type: 'full', timeline: updatedTimeline });

      // Step 2: Transform
      updatedTimeline = updateTimelineStep(updatedTimeline, '2', { status: 'running' });
      setTestResult({ type: 'full', timeline: updatedTimeline });

      const response = await api.v1.admin.sandbox['test-full'].post({
        invoice: validation.data,
        erpType: erpType,
      });

      if (response.error) {
        const errorMessage = (response.error as any)?.value?.error || (response.error as any)?.value?.message || 'Workflow test failed';
        updatedTimeline = updateTimelineStep(updatedTimeline, '2', { 
          status: 'error',
          errors: [errorMessage],
          timestamp: new Date()
        });
        // Mark remaining steps as error
        ['3', '4', '5', '6'].forEach(stepId => {
          updatedTimeline = updateTimelineStep(updatedTimeline, stepId, { status: 'error' });
        });
        setTestResult({ type: 'full', timeline: updatedTimeline, error: errorMessage });
        toast.error(errorMessage);
      } else if (response.data?.data) {
        const data = response.data.data;
        
        // Step 2: Transform complete
        updatedTimeline = updateTimelineStep(updatedTimeline, '2', { 
          status: 'success',
          data: data.transformed,
          timestamp: new Date()
        });
        setTestResult({ type: 'full', timeline: updatedTimeline });

        // Step 3: Validate
        updatedTimeline = updateTimelineStep(updatedTimeline, '3', { status: 'running' });
        setTestResult({ type: 'full', timeline: updatedTimeline });
        await new Promise(resolve => setTimeout(resolve, 300));
        updatedTimeline = updateTimelineStep(updatedTimeline, '3', { 
          status: data.validation?.valid ? 'success' : 'error',
          errors: data.validation?.errors,
          timestamp: new Date(),
          duration: 300
        });
        setTestResult({ type: 'full', timeline: updatedTimeline });

        // Step 4: Generate QR Code
        updatedTimeline = updateTimelineStep(updatedTimeline, '4', { status: 'running' });
        setTestResult({ type: 'full', timeline: updatedTimeline });
        await new Promise(resolve => setTimeout(resolve, 250));
        updatedTimeline = updateTimelineStep(updatedTimeline, '4', { 
          status: 'success',
          timestamp: new Date(),
          duration: 250
        });
        setTestResult({ type: 'full', timeline: updatedTimeline });

        // Step 5: Sign Invoice
        updatedTimeline = updateTimelineStep(updatedTimeline, '5', { status: 'running' });
        setTestResult({ type: 'full', timeline: updatedTimeline });
        await new Promise(resolve => setTimeout(resolve, 200));
        updatedTimeline = updateTimelineStep(updatedTimeline, '5', { 
          status: 'success',
          timestamp: new Date(),
          duration: 200
        });
        setTestResult({ type: 'full', timeline: updatedTimeline });

        // Step 6: Complete
        updatedTimeline = updateTimelineStep(updatedTimeline, '6', { status: 'running' });
        setTestResult({ type: 'full', timeline: updatedTimeline });
        await new Promise(resolve => setTimeout(resolve, 100));
        updatedTimeline = updateTimelineStep(updatedTimeline, '6', { 
          status: 'success',
          timestamp: new Date(),
          duration: 100
        });

        setTestResult({ 
          type: 'full', 
          timeline: updatedTimeline, 
          result: data 
        });
        toast.success('Full workflow test completed');
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Workflow test failed';
      const updatedTimeline = updateTimelineStep(timeline, '2', { 
        status: 'error',
        errors: [errorMessage],
        timestamp: new Date()
      });
      setTestResult({ type: 'full', timeline: updatedTimeline, error: errorMessage });
      toast.error(errorMessage);
    } finally {
      setTesting(false);
    }
  };

  const handleRunTest = () => {
    if (activeTab === 'transform') {
      testTransform();
    } else if (activeTab === 'validate') {
      testValidate();
    } else if (activeTab === 'full') {
      testFullWorkflow();
    }
  };

  const getStepIcon = (status: TimelineStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-destructive" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStepColor = (status: TimelineStep['status']) => {
    switch (status) {
      case 'success':
        return 'border-success bg-success/10';
      case 'error':
        return 'border-destructive bg-destructive/10';
      case 'running':
        return 'border-primary bg-primary/10';
      default:
        return 'border-muted bg-muted/50';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Sandbox</h1>
          <p className="page-subtitle">Test invoice transformation, validation, and full workflow</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
            <CardDescription>
              Configure your test parameters and invoice data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="transform">
                  <Code2 className="w-4 h-4 mr-2" />
                  Transform
                </TabsTrigger>
                <TabsTrigger value="validate">
                  <FileCheck className="w-4 h-4 mr-2" />
                  Validate
                </TabsTrigger>
                <TabsTrigger value="full">
                  <Workflow className="w-4 h-4 mr-2" />
                  Full Workflow
                </TabsTrigger>
              </TabsList>

              <TabsContent value="transform" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="erp-type-transform">ERP Type *</Label>
                  <Select value={erpType} onValueChange={setErpType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ERP type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ERP_OPTIONS.map((erp) => (
                        <SelectItem key={erp} value={erp}>
                          {erp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="validate" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Validate invoice against FIRS UBL schema
                </p>
              </TabsContent>

              <TabsContent value="full" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="erp-type-full">ERP Type *</Label>
                  <Select value={erpType} onValueChange={setErpType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ERP type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ERP_OPTIONS.map((erp) => (
                        <SelectItem key={erp} value={erp}>
                          {erp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label htmlFor="invoice-json">Invoice JSON *</Label>
              <div className="border rounded-lg overflow-hidden">
                <Editor
                  height="300px"
                  defaultLanguage="json"
                  value={invoiceJson}
                  onChange={(value) => {
                    setInvoiceJson(value || '');
                    setInvoiceError(null);
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>
              {invoiceError && (
                <p className="text-sm text-destructive">{invoiceError}</p>
              )}
            </div>

            <Button 
              onClick={handleRunTest} 
              disabled={testing || !invoiceJson || (activeTab !== 'validate' && !erpType)}
              className="w-full"
              size="lg"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Test
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Right Column: Timeline and Results */}
        <Card>
          <CardHeader>
            <CardTitle>Test Timeline</CardTitle>
            <CardDescription>
              Real-time progress of your test execution
            </CardDescription>
          </CardHeader>
          <CardContent>
            {testResult ? (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {/* Timeline */}
                  <div className="relative">
                    {testResult.timeline.map((step, index) => {
                      const isLast = index === testResult.timeline.length - 1;
                      return (
                        <div key={step.id} className="relative flex gap-4">
                          {/* Timeline Line */}
                          {!isLast && (
                            <div className={`absolute left-[10px] top-[24px] w-0.5 h-full ${
                              step.status === 'success' 
                                ? 'bg-success' 
                                : step.status === 'error'
                                ? 'bg-destructive'
                                : step.status === 'running'
                                ? 'bg-primary'
                                : 'bg-muted'
                            }`} />
                          )}
                          
                          {/* Step Icon */}
                          <div className={`relative z-10 flex items-center justify-center w-5 h-5 rounded-full border-2 ${getStepColor(step.status)}`}>
                            {getStepIcon(step.status)}
                          </div>

                          {/* Step Content */}
                          <div className="flex-1 pb-8">
                            <div className={`p-4 rounded-lg border ${getStepColor(step.status)}`}>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">{step.name}</h4>
                                <div className="flex items-center gap-2">
                                  {step.status === 'success' && (
                                    <Badge variant="outline" className="bg-success/10 text-success border-success">
                                      Success
                                    </Badge>
                                  )}
                                  {step.status === 'error' && (
                                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive">
                                      Error
                                    </Badge>
                                  )}
                                  {step.status === 'running' && (
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
                                      Running
                                    </Badge>
                                  )}
                                  {step.status === 'pending' && (
                                    <Badge variant="outline">
                                      Pending
                                    </Badge>
                                  )}
                                  {step.duration && (
                                    <span className="text-xs text-muted-foreground">
                                      {step.duration}ms
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {step.timestamp && (
                                <p className="text-xs text-muted-foreground mb-2">
                                  {step.timestamp.toLocaleTimeString()}
                                </p>
                              )}

                              {step.errors && step.errors.length > 0 && (
                                <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm">
                                  <p className="font-medium text-destructive mb-1">Errors:</p>
                                  <ul className="list-disc list-inside space-y-1">
                                    {step.errors.map((error, idx) => (
                                      <li key={idx} className="text-destructive">{error}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {step.warnings && step.warnings.length > 0 && (
                                <div className="mt-2 p-2 bg-warning/10 border border-warning/20 rounded text-sm">
                                  <p className="font-medium text-warning mb-1">Warnings:</p>
                                  <ul className="list-disc list-inside space-y-1">
                                    {step.warnings.map((warning, idx) => (
                                      <li key={idx} className="text-warning">{warning}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Results Summary */}
                  {testResult.result && (
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Test Results</h4>
                      <div className="space-y-2 text-sm">
                        {testResult.type === 'transform' && (
                          <>
                            <p><strong>Original:</strong> {JSON.stringify(testResult.result.original).substring(0, 100)}...</p>
                            <p><strong>Transformed:</strong> {JSON.stringify(testResult.result.transformed).substring(0, 100)}...</p>
                          </>
                        )}
                        {testResult.type === 'validate' && (
                          <>
                            <p><strong>Valid:</strong> {testResult.result.valid ? 'Yes' : 'No'}</p>
                            {testResult.result.errors && testResult.result.errors.length > 0 && (
                              <p><strong>Errors:</strong> {testResult.result.errors.length}</p>
                            )}
                            {testResult.result.warnings && testResult.result.warnings.length > 0 && (
                              <p><strong>Warnings:</strong> {testResult.result.warnings.length}</p>
                            )}
                          </>
                        )}
                        {testResult.type === 'full' && (
                          <>
                            <p><strong>Transformation:</strong> Success</p>
                            <p><strong>Validation:</strong> {testResult.result.validation?.valid ? 'Passed' : 'Failed'}</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-[500px] text-center text-muted-foreground">
                <Code2 className="w-12 h-12 mb-4 opacity-50" />
                <p>No test run yet</p>
                <p className="text-sm">Configure your test and click "Run Test" to see the timeline</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
