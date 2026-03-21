'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Package,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatErpName } from '@/hooks/use-supported-erps'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { StatusBadge } from '@/components/shared'
import { toast } from '@/components/ui/sonner'
import { createTenantApi } from '@/lib/api/tenant-api'
import { SectionLoader } from '@/components/shared/SectionLoader'

export default function TransactionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const irn = params.irn as string

  const [isLoading, setIsLoading] = useState(true)
  const [invoiceType, setInvoiceType] = useState<'outbound' | 'inbound' | null>(null)
  const [details, setDetails] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showResendDialog, setShowResendDialog] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!irn) return
    fetchDetails()
  }, [irn])

  const fetchDetails = async () => {
    setIsLoading(true)
    setError(null)
    const api = createTenantApi()

    // Try outbound first, then inbound
    try {
      const outboundRes = await api.getOutboundInvoice(irn)
      if (!outboundRes.error && outboundRes.data?.data) {
        setInvoiceType('outbound')
        setDetails(outboundRes.data.data)
        setIsLoading(false)
        return
      }
    } catch {}

    try {
      const inboundRes = await api.getInboundInvoice(irn)
      if (!inboundRes.error && inboundRes.data?.data) {
        setInvoiceType('inbound')
        setDetails(inboundRes.data.data)
        setIsLoading(false)
        return
      }
    } catch {}

    setError('Invoice not found')
    setIsLoading(false)
  }

  const handleResend = async () => {
    if (invoiceType !== 'outbound') return
    setResending(true)
    try {
      const api = createTenantApi()
      const response = await api.resendOutboundInvoice(irn)
      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to resend invoice')
      } else {
        toast.success('Invoice queued for resend')
        setShowResendDialog(false)
        fetchDetails()
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to resend invoice')
    } finally {
      setResending(false)
    }
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency || 'NGN',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const isFailed = (status: string) => {
    const s = status?.toLowerCase() || ''
    return s === 'failed' || s === 'rejected'
  }

  if (isLoading) {
    return <SectionLoader message="Loading invoice" />
  }

  if (error || !details) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/transactions')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Transactions
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-lg font-medium">{error || 'Invoice not found'}</p>
            <p className="text-sm text-muted-foreground">
              The invoice with IRN &quot;{irn}&quot; could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const invoice = details.invoice || {}
  const status = invoice.status || ''

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/transactions')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${invoiceType === 'outbound' ? 'bg-primary/10' : 'bg-accent/10'}`}>
                  {invoiceType === 'outbound' ? (
                    <ArrowUpRight className="w-5 h-5 text-primary" />
                  ) : (
                    <ArrowDownLeft className="w-5 h-5 text-accent" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">
                    {invoice.invoiceNumber || invoice.irn || irn}
                  </h1>
                  <p className="text-muted-foreground capitalize">{invoiceType} Invoice</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            {invoiceType === 'outbound' && isFailed(status) && (
              <Button variant="outline" size="sm" onClick={() => setShowResendDialog(true)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Resend
              </Button>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data">Invoice Data</TabsTrigger>
            <TabsTrigger value="history">Status History</TabsTrigger>
            {invoiceType === 'outbound' && (
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* QR Code and ERP */}
            {(invoice.qrCode || invoice.erp) && (
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {invoice.qrCode && (
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm font-medium text-muted-foreground">QR Code</p>
                        <div className="p-3 bg-white rounded-lg border">
                          <img
                            src={invoice.qrCode.toString()}
                            alt="QR Code"
                            className="w-[150px] h-[150px]"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Scan to verify invoice</p>
                      </div>
                    )}
                    {invoice.erp && (
                      <div className="flex flex-col justify-center gap-2">
                        <p className="text-sm font-medium text-muted-foreground">ERP System</p>
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                          <Package className="w-5 h-5 text-primary" />
                          <span className="text-lg font-semibold">{formatErpName(invoice.erp)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailField label="IRN" value={invoice.irn || irn} mono />
                  <DetailField label="Status" value={<StatusBadge status={status} />} />
                  <DetailField
                    label="Total Amount"
                    value={formatAmount(Number(invoice.totalAmount || 0), invoice.currency || 'NGN')}
                    bold
                  />
                  {invoice.currency && <DetailField label="Currency" value={invoice.currency} />}
                  {invoiceType === 'outbound' && invoice.customerName && (
                    <DetailField label="Customer" value={invoice.customerName} />
                  )}
                  {invoiceType === 'inbound' && (
                    <>
                      <DetailField label="Supplier" value={invoice.supplierName} />
                      <DetailField label="Supplier TIN" value={invoice.supplierTIN} mono />
                      {invoice.paymentStatus && (
                        <DetailField label="Payment Status" value={<StatusBadge status={invoice.paymentStatus} />} />
                      )}
                      {invoice.issueDate && (
                        <DetailField label="Issue Date" value={format(new Date(invoice.issueDate), 'PPP')} />
                      )}
                      {invoice.dueDate && (
                        <DetailField label="Due Date" value={format(new Date(invoice.dueDate), 'PPP')} />
                      )}
                    </>
                  )}
                  {invoice.createdAt && (
                    <DetailField label="Created" value={format(new Date(invoice.createdAt), 'PPpp')} />
                  )}
                  {invoice.updatedAt && (
                    <DetailField label="Updated" value={format(new Date(invoice.updatedAt), 'PPpp')} />
                  )}
                  {invoice.validationAttempts != null && (
                    <DetailField label="Validation Attempts" value={String(invoice.validationAttempts)} />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Validation Errors */}
            {invoice.validationErrors && invoice.validationErrors.length > 0 && (
              <Card className="border-destructive/30">
                <CardHeader>
                  <CardTitle className="text-destructive">Validation Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {invoice.validationErrors.map((err: any, idx: number) => (
                      <li key={idx}>{err.message || JSON.stringify(err)}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="data" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Raw Invoice Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-lg">
                  <pre className="text-xs overflow-auto whitespace-pre-wrap max-h-[600px]">
                    {JSON.stringify(
                      invoice.invoiceData || invoice.decryptedData || invoice,
                      null,
                      2
                    )}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Status History</CardTitle>
              </CardHeader>
              <CardContent>
                {details.statusHistory && details.statusHistory.length > 0 ? (
                  <div className="space-y-3">
                    {details.statusHistory.map((history: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium capitalize">{history.status || 'Status Change'}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(history.timestamp || Date.now()), 'PPpp')}
                            </p>
                          </div>
                          {history.details && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {typeof history.details === 'string' ? history.details : JSON.stringify(history.details)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No status history available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {invoiceType === 'outbound' && (
            <TabsContent value="webhooks" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Webhook Events</CardTitle>
                </CardHeader>
                <CardContent>
                  {details.webhookEvents && details.webhookEvents.length > 0 ? (
                    <div className="space-y-3">
                      {details.webhookEvents.map((event: any, idx: number) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">{event.eventType || 'Webhook Event'}</p>
                            <StatusBadge status={event.status || 'pending'} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(event.createdAt || Date.now()), 'PPpp')}
                          </p>
                          {event.response && (
                            <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                              {JSON.stringify(event.response, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No webhook events available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Resend Dialog */}
      <AlertDialog open={showResendDialog} onOpenChange={setShowResendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to resend this invoice? This will restart the workflow from the beginning.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResend}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              disabled={resending}
            >
              {resending ? 'Resending...' : 'Resend Invoice'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function DetailField({
  label,
  value,
  mono,
  bold,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  bold?: boolean
}) {
  return (
    <div className="py-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className={`mt-1 text-sm ${mono ? 'font-mono' : ''} ${bold ? 'font-semibold text-base' : ''}`}>
        {value || 'N/A'}
      </div>
    </div>
  )
}
