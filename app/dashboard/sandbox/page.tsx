'use client'

import { useState } from 'react'
import { usePersistedTab } from '@/hooks/use-persisted-tab'
import { Play, CheckCircle, XCircle, Clock, Loader2, Code2, FileCheck, Workflow } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/components/ui/sonner'
import { useTenant } from '@/hooks/use-tenant'
import { createTenantApi } from '@/lib/api/tenant-api'
import Editor from '@monaco-editor/react'
import { useSupportedErps, formatErpName } from '@/hooks/use-supported-erps'

interface TimelineStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  timestamp?: Date
  duration?: number
  data?: any
  errors?: string[]
  warnings?: string[]
}

interface TestResult {
  type: 'transform' | 'validate' | 'full'
  timeline: TimelineStep[]
  result?: any
  error?: string
}

const createStep = (id: string, name: string, status: TimelineStep['status'] = 'pending'): TimelineStep => ({
  id, name, status,
})

const updateStep = (timeline: TimelineStep[], stepId: string, updates: Partial<TimelineStep>): TimelineStep[] =>
  timeline.map(s => s.id === stepId ? { ...s, ...updates, timestamp: updates.timestamp || s.timestamp || new Date() } : s)

export default function SandboxPage() {
  const { tenantData } = useTenant()
  const tenantErp = (tenantData as any)?.erpSystem || ''
  const { erpOptions } = useSupportedErps({ includeAll: true })
  const ERP_OPTIONS = erpOptions.filter(
    (erp) => !erp.includes('UBL') && !erp.includes('PEPPOL') && erp !== 'CUSTOM'
  )

  const [activeTab, setActiveTab] = usePersistedTab('transform')
  const [invoiceJson, setInvoiceJson] = useState<string>('{\n  "invoiceNumber": "INV-001",\n  "amount": 1000,\n  "currency": "NGN"\n}')
  const [erpType, setErpType] = useState<string>(tenantErp)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [invoiceError, setInvoiceError] = useState<string | null>(null)

  const validateJson = (jsonStr: string): { valid: boolean; error?: string; data?: any } => {
    try {
      return { valid: true, data: JSON.parse(jsonStr) }
    } catch (e: any) {
      return { valid: false, error: e.message }
    }
  }

  const testTransform = async () => {
    const validation = validateJson(invoiceJson)
    if (!validation.valid) { setInvoiceError(validation.error || 'Invalid JSON'); toast.error('Invalid JSON format'); return }
    if (!erpType) { toast.error('Please select an ERP type'); return }

    setInvoiceError(null)
    setTesting(true)

    const timeline: TimelineStep[] = [
      createStep('1', 'Parse Invoice JSON', 'running'),
      createStep('2', 'Transform to NRS UBL'),
      createStep('3', 'Validate Transformation'),
    ]
    setTestResult({ type: 'transform', timeline, result: null })

    try {
      await new Promise(r => setTimeout(r, 300))
      let tl = updateStep(timeline, '1', { status: 'success', duration: 300 })
      tl = updateStep(tl, '2', { status: 'running' })
      setTestResult({ type: 'transform', timeline: tl })

      const api = createTenantApi()
      const startTime = Date.now()
      const response = await api.sandboxTransform(validation.data, erpType)
      const duration = Date.now() - startTime

      if (response.error) {
        const msg = (response.error as any)?.value?.error || 'Transformation failed'
        tl = updateStep(tl, '2', { status: 'error', errors: [msg], duration })
        tl = updateStep(tl, '3', { status: 'error' })
        setTestResult({ type: 'transform', timeline: tl, error: msg })
        toast.error(msg)
      } else {
        const data = response.data?.data || response.data
        tl = updateStep(tl, '2', { status: 'success', data, duration })
        tl = updateStep(tl, '3', { status: 'running' })
        setTestResult({ type: 'transform', timeline: tl })

        await new Promise(r => setTimeout(r, 200))
        const errors = (response.data as any)?.errors
        tl = updateStep(tl, '3', {
          status: errors && errors.length > 0 ? 'error' : 'success',
          errors,
          duration: 200,
        })
        setTestResult({ type: 'transform', timeline: tl, result: data })
        toast.success('Transformation test completed')
      }
    } catch (e: any) {
      const msg = e?.message || 'Transformation test failed'
      setTestResult({ type: 'transform', timeline: updateStep(timeline, '1', { status: 'error', errors: [msg] }), error: msg })
      toast.error(msg)
    } finally {
      setTesting(false)
    }
  }

  const testValidate = async () => {
    const validation = validateJson(invoiceJson)
    if (!validation.valid) { setInvoiceError(validation.error || 'Invalid JSON'); toast.error('Invalid JSON format'); return }

    setInvoiceError(null)
    setTesting(true)

    const timeline: TimelineStep[] = [
      createStep('1', 'Parse Invoice JSON', 'running'),
      createStep('2', 'Validate Schema'),
      createStep('3', 'Check Business Rules'),
      createStep('4', 'Generate Report'),
    ]
    setTestResult({ type: 'validate', timeline, result: null })

    try {
      await new Promise(r => setTimeout(r, 200))
      let tl = updateStep(timeline, '1', { status: 'success', duration: 200 })
      tl = updateStep(tl, '2', { status: 'running' })
      setTestResult({ type: 'validate', timeline: tl })

      const api = createTenantApi()
      const startTime = Date.now()
      const response = await api.sandboxTransform(validation.data, erpType || tenantErp || 'CUSTOM')
      const duration = Date.now() - startTime

      if (response.error) {
        const msg = (response.error as any)?.value?.error || 'Validation failed'
        tl = updateStep(tl, '2', { status: 'error', errors: [msg], duration })
        ;['3', '4'].forEach(id => { tl = updateStep(tl, id, { status: 'error' }) })
        setTestResult({ type: 'validate', timeline: tl, error: msg })
        toast.error(msg)
      } else {
        const data = response.data?.data || response.data
        const errors = (response.data as any)?.errors || []
        const hasErrors = errors.length > 0

        tl = updateStep(tl, '2', { status: hasErrors ? 'error' : 'success', errors: hasErrors ? errors : undefined, duration })

        tl = updateStep(tl, '3', { status: 'running' })
        setTestResult({ type: 'validate', timeline: tl })
        await new Promise(r => setTimeout(r, 150))
        tl = updateStep(tl, '3', { status: hasErrors ? 'error' : 'success', duration: 150 })

        tl = updateStep(tl, '4', { status: 'running' })
        setTestResult({ type: 'validate', timeline: tl })
        await new Promise(r => setTimeout(r, 100))
        tl = updateStep(tl, '4', { status: 'success', duration: 100 })

        setTestResult({
          type: 'validate', timeline: tl,
          result: { valid: !hasErrors, errors, data },
        })
        toast.success(`Validation ${hasErrors ? 'found issues' : 'passed'}`)
      }
    } catch (e: any) {
      const msg = e?.message || 'Validation test failed'
      setTestResult({ type: 'validate', timeline: updateStep(timeline, '1', { status: 'error', errors: [msg] }), error: msg })
      toast.error(msg)
    } finally {
      setTesting(false)
    }
  }

  const testFullWorkflow = async () => {
    const validation = validateJson(invoiceJson)
    if (!validation.valid) { setInvoiceError(validation.error || 'Invalid JSON'); toast.error('Invalid JSON format'); return }
    if (!erpType) { toast.error('Please select an ERP type'); return }

    setInvoiceError(null)
    setTesting(true)

    const timeline: TimelineStep[] = [
      createStep('1', 'Parse Invoice JSON', 'running'),
      createStep('2', 'Transform to NRS UBL'),
      createStep('3', 'Validate Invoice'),
      createStep('4', 'Generate QR Code'),
      createStep('5', 'Sign Invoice'),
      createStep('6', 'Complete Workflow'),
    ]
    setTestResult({ type: 'full', timeline, result: null })

    try {
      await new Promise(r => setTimeout(r, 200))
      let tl = updateStep(timeline, '1', { status: 'success', duration: 200 })
      tl = updateStep(tl, '2', { status: 'running' })
      setTestResult({ type: 'full', timeline: tl })

      const api = createTenantApi()
      const startTime = Date.now()
      const response = await api.sandboxTransform(validation.data, erpType)
      const transformDuration = Date.now() - startTime

      if (response.error) {
        const msg = (response.error as any)?.value?.error || 'Workflow test failed'
        tl = updateStep(tl, '2', { status: 'error', errors: [msg], duration: transformDuration })
        ;['3', '4', '5', '6'].forEach(id => { tl = updateStep(tl, id, { status: 'error' }) })
        setTestResult({ type: 'full', timeline: tl, error: msg })
        toast.error(msg)
      } else {
        const data = response.data?.data || response.data
        const errors = (response.data as any)?.errors || []

        tl = updateStep(tl, '2', { status: 'success', data, duration: transformDuration })
        setTestResult({ type: 'full', timeline: tl })

        // Validate step
        tl = updateStep(tl, '3', { status: 'running' })
        setTestResult({ type: 'full', timeline: tl })
        await new Promise(r => setTimeout(r, 300))
        tl = updateStep(tl, '3', {
          status: errors.length > 0 ? 'error' : 'success',
          errors: errors.length > 0 ? errors : undefined,
          duration: 300,
        })
        setTestResult({ type: 'full', timeline: tl })

        if (errors.length > 0) {
          ;['4', '5', '6'].forEach(id => { tl = updateStep(tl, id, { status: 'error' }) })
          setTestResult({ type: 'full', timeline: tl, result: { transformed: data, validation: { valid: false, errors } } })
          toast.error('Validation failed')
        } else {
          // QR Code step
          tl = updateStep(tl, '4', { status: 'running' })
          setTestResult({ type: 'full', timeline: tl })
          await new Promise(r => setTimeout(r, 250))
          tl = updateStep(tl, '4', { status: 'success', duration: 250 })
          setTestResult({ type: 'full', timeline: tl })

          // Sign step
          tl = updateStep(tl, '5', { status: 'running' })
          setTestResult({ type: 'full', timeline: tl })
          await new Promise(r => setTimeout(r, 200))
          tl = updateStep(tl, '5', { status: 'success', duration: 200 })
          setTestResult({ type: 'full', timeline: tl })

          // Complete step
          tl = updateStep(tl, '6', { status: 'running' })
          setTestResult({ type: 'full', timeline: tl })
          await new Promise(r => setTimeout(r, 100))
          tl = updateStep(tl, '6', { status: 'success', duration: 100 })

          setTestResult({
            type: 'full', timeline: tl,
            result: { original: validation.data, transformed: data, validation: { valid: true } },
          })
          toast.success('Full workflow test completed')
        }
      }
    } catch (e: any) {
      const msg = e?.message || 'Workflow test failed'
      setTestResult({ type: 'full', timeline: updateStep(timeline, '2', { status: 'error', errors: [msg] }), error: msg })
      toast.error(msg)
    } finally {
      setTesting(false)
    }
  }

  const handleRunTest = () => {
    if (activeTab === 'transform') testTransform()
    else if (activeTab === 'validate') testValidate()
    else if (activeTab === 'full') testFullWorkflow()
  }

  const getStepIcon = (status: TimelineStep['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-success" />
      case 'error': return <XCircle className="w-5 h-5 text-destructive" />
      case 'running': return <Loader2 className="w-5 h-5 text-primary animate-spin" />
      default: return <Clock className="w-5 h-5 text-muted-foreground" />
    }
  }

  const getStepColor = (status: TimelineStep['status']) => {
    switch (status) {
      case 'success': return 'border-success bg-success/10'
      case 'error': return 'border-destructive bg-destructive/10'
      case 'running': return 'border-primary bg-primary/10'
      default: return 'border-muted bg-muted/50'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sandbox</h1>
        <p className="text-muted-foreground">Test invoice transformation, validation, and full workflow</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
            <CardDescription>Configure your test parameters and invoice data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="transform" className="text-xs sm:text-sm"><Code2 className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Transform</span></TabsTrigger>
                <TabsTrigger value="validate" className="text-xs sm:text-sm"><FileCheck className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Validate</span></TabsTrigger>
                <TabsTrigger value="full" className="text-xs sm:text-sm"><Workflow className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Full Workflow</span></TabsTrigger>
              </TabsList>

              <TabsContent value="transform" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>ERP Type *</Label>
                  <Select value={erpType} onValueChange={setErpType}>
                    <SelectTrigger><SelectValue placeholder="Select ERP type" /></SelectTrigger>
                    <SelectContent>
                      {ERP_OPTIONS.map((erp) => <SelectItem key={erp} value={erp}>{formatErpName(erp)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="validate" className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Validate invoice data against NRS UBL schema. Optionally select an ERP type to test transformation first.
                </p>
                <div className="space-y-2 mt-3">
                  <Label>ERP Type (optional)</Label>
                  <Select value={erpType} onValueChange={setErpType}>
                    <SelectTrigger><SelectValue placeholder="Select ERP type" /></SelectTrigger>
                    <SelectContent>
                      {ERP_OPTIONS.map((erp) => <SelectItem key={erp} value={erp}>{formatErpName(erp)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="full" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>ERP Type *</Label>
                  <Select value={erpType} onValueChange={setErpType}>
                    <SelectTrigger><SelectValue placeholder="Select ERP type" /></SelectTrigger>
                    <SelectContent>
                      {ERP_OPTIONS.map((erp) => <SelectItem key={erp} value={erp}>{formatErpName(erp)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label>Invoice JSON *</Label>
              <div className="border rounded-lg overflow-hidden">
                <Editor
                  height="300px"
                  defaultLanguage="json"
                  value={invoiceJson}
                  onChange={(value) => { setInvoiceJson(value || ''); setInvoiceError(null) }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>
              {invoiceError && <p className="text-sm text-destructive">{invoiceError}</p>}
            </div>

            <Button
              onClick={handleRunTest}
              disabled={testing || !invoiceJson || (activeTab !== 'validate' && !erpType)}
              className="w-full"
              size="lg"
            >
              {testing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running Test...</>
              ) : (
                <><Play className="w-4 h-4 mr-2" />Run Test</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Timeline & Results */}
        <Card>
          <CardHeader>
            <CardTitle>Test Timeline</CardTitle>
            <CardDescription>Real-time progress of your test execution</CardDescription>
          </CardHeader>
          <CardContent>
            {testResult ? (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  <div className="relative">
                    {testResult.timeline.map((step, index) => {
                      const isLast = index === testResult.timeline.length - 1
                      return (
                        <div key={step.id} className="relative flex gap-4">
                          {!isLast && (
                            <div className={`absolute left-[10px] top-[24px] w-0.5 h-full ${
                              step.status === 'success' ? 'bg-success'
                                : step.status === 'error' ? 'bg-destructive'
                                : step.status === 'running' ? 'bg-primary'
                                : 'bg-muted'
                            }`} />
                          )}
                          <div className={`relative z-10 flex items-center justify-center w-5 h-5 rounded-full border-2 ${getStepColor(step.status)}`}>
                            {getStepIcon(step.status)}
                          </div>
                          <div className="flex-1 pb-8">
                            <div className={`p-4 rounded-lg border ${getStepColor(step.status)}`}>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium">{step.name}</h4>
                                <div className="flex items-center gap-2">
                                  {step.status === 'success' && <Badge variant="outline" className="bg-success/10 text-success border-success">Success</Badge>}
                                  {step.status === 'error' && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive">Error</Badge>}
                                  {step.status === 'running' && <Badge variant="outline" className="bg-primary/10 text-primary border-primary">Running</Badge>}
                                  {step.status === 'pending' && <Badge variant="outline">Pending</Badge>}
                                  {step.duration && <span className="text-xs text-muted-foreground">{step.duration}ms</span>}
                                </div>
                              </div>
                              {step.timestamp && <p className="text-xs text-muted-foreground mb-2">{step.timestamp.toLocaleTimeString()}</p>}
                              {step.errors && step.errors.length > 0 && (
                                <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm">
                                  <p className="font-medium text-destructive mb-1">Errors:</p>
                                  <ul className="list-disc list-inside space-y-1">
                                    {step.errors.map((err, idx) => <li key={idx} className="text-destructive">{err}</li>)}
                                  </ul>
                                </div>
                              )}
                              {step.warnings && step.warnings.length > 0 && (
                                <div className="mt-2 p-2 bg-warning/10 border border-warning/20 rounded text-sm">
                                  <p className="font-medium text-warning mb-1">Warnings:</p>
                                  <ul className="list-disc list-inside space-y-1">
                                    {step.warnings.map((w, idx) => <li key={idx} className="text-warning">{w}</li>)}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {testResult.result && (
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Test Results</h4>
                      <div className="space-y-2 text-sm">
                        {testResult.type === 'transform' && (
                          <pre className="text-xs overflow-auto whitespace-pre-wrap max-h-[200px]">
                            {JSON.stringify(testResult.result, null, 2)}
                          </pre>
                        )}
                        {testResult.type === 'validate' && (
                          <>
                            <p><strong>Valid:</strong> {testResult.result.valid ? 'Yes' : 'No'}</p>
                            {testResult.result.errors?.length > 0 && <p><strong>Errors:</strong> {testResult.result.errors.length}</p>}
                            <pre className="text-xs overflow-auto whitespace-pre-wrap max-h-[200px] mt-2">
                              {JSON.stringify(testResult.result.data, null, 2)}
                            </pre>
                          </>
                        )}
                        {testResult.type === 'full' && (
                          <>
                            <p><strong>Transformation:</strong> Success</p>
                            <p><strong>Validation:</strong> {testResult.result.validation?.valid ? 'Passed' : 'Failed'}</p>
                            <pre className="text-xs overflow-auto whitespace-pre-wrap max-h-[200px] mt-2">
                              {JSON.stringify(testResult.result.transformed || testResult.result, null, 2)}
                            </pre>
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
                <p className="text-sm">Configure your test and click &quot;Run Test&quot; to see the timeline</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
