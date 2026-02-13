'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import {
  Eye,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  QrCode,
  Package,
} from 'lucide-react'
import { DataTable, Column, FilterOption, StatusBadge } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import { createTenantApi } from '@/lib/api/tenant-api'

interface Invoice {
  id: string
  irn: string
  invoiceNumber: string
  type: 'inbound' | 'outbound'
  customerName?: string
  supplierName?: string
  supplierTIN?: string
  status: string
  paymentStatus?: string
  totalAmount: number
  currency: string
  issueDate: Date | string
  dueDate?: Date | string
  receivedAt?: Date | string
  createdAt: Date | string
  updatedAt?: Date | string
  workflowState?: any
  qrCode?: string
  erp?: string
}

const transactionFilters: FilterOption[] = [
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'all', label: 'All Statuses' },
      { value: 'pending', label: 'Pending' },
      { value: 'validated', label: 'Validated' },
      { value: 'signed', label: 'Signed' },
      { value: 'transmitted', label: 'Transmitted' },
      { value: 'received', label: 'Received' },
      { value: 'acknowledged', label: 'Acknowledged' },
      { value: 'failed', label: 'Failed' },
      { value: 'rejected', label: 'Rejected' },
    ],
  },
]

export default function TransactionsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'all' | 'outbound' | 'inbound'>('all')

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showResendDialog, setShowResendDialog] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [invoiceDetails, setInvoiceDetails] = useState<any>(null)
  const [resending, setResending] = useState(false)

  const fetchInvoices = async () => {
    setIsLoading(true)
    try {
      const api = createTenantApi()
      const allInvoices: Invoice[] = []
      let totalCount = 0

      if (activeTab === 'all' || activeTab === 'outbound') {
        try {
          const outboundResponse = await api.getOutboundInvoices({
            page: page.toString(),
            limit: '50',
            ...(filters.status && filters.status !== 'all' && { status: filters.status }),
          })

          if (outboundResponse.data?.data) {
            const outboundData = outboundResponse.data.data as any[]
            const pagination = outboundResponse.data.pagination

            outboundData.forEach((invoice: any) => {
              allInvoices.push({
                id: invoice.irn,
                irn: invoice.irn,
                invoiceNumber: invoice.invoiceNumber || invoice.irn,
                type: 'outbound',
                status: invoice.status,
                totalAmount: invoice.totalAmount || 0,
                currency: invoice.currency || 'NGN',
                customerName: invoice.customerName,
                issueDate: invoice.createdAt,
                createdAt: invoice.createdAt,
                updatedAt: invoice.updatedAt,
                workflowState: invoice.workflowState,
                qrCode: invoice.qrCode,
                erp: invoice.erp,
              })
            })

            totalCount += pagination?.total || 0
          }
        } catch (error) {
          console.error('Failed to fetch outbound invoices:', error)
        }
      }

      if (activeTab === 'all' || activeTab === 'inbound') {
        try {
          const inboundResponse = await api.getInboundInvoices({
            page: page.toString(),
            limit: '50',
            ...(filters.status && filters.status !== 'all' && { status: filters.status }),
          })

          if (inboundResponse.data?.data) {
            const inboundData = inboundResponse.data.data as any[]
            const pagination = inboundResponse.data.pagination

            inboundData.forEach((invoice: any) => {
              allInvoices.push({
                id: invoice.irn,
                irn: invoice.irn,
                invoiceNumber: invoice.invoiceNumber || invoice.irn,
                type: 'inbound',
                status: invoice.status,
                paymentStatus: invoice.paymentStatus,
                totalAmount: invoice.totalAmount || 0,
                currency: invoice.currency || 'NGN',
                supplierName: invoice.supplierName,
                supplierTIN: invoice.supplierTIN,
                issueDate: invoice.issueDate,
                dueDate: invoice.dueDate,
                receivedAt: invoice.receivedAt,
                createdAt: invoice.receivedAt || invoice.issueDate,
                updatedAt: invoice.issueDate,
              })
            })

            totalCount += pagination?.total || 0
          }
        } catch (error) {
          console.error('Failed to fetch inbound invoices:', error)
        }
      }

      // Client-side search filter
      let filtered = allInvoices
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        filtered = allInvoices.filter((inv) =>
          (inv.invoiceNumber || '').toLowerCase().includes(searchLower) ||
          (inv.irn || '').toLowerCase().includes(searchLower) ||
          (inv.customerName || '').toLowerCase().includes(searchLower) ||
          (inv.supplierName || '').toLowerCase().includes(searchLower)
        )
      }

      setInvoices(filtered)
      setTotal(totalCount || filtered.length)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load transactions')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [page, searchQuery, filters, activeTab])

  const fetchInvoiceDetails = async (invoice: Invoice) => {
    setDetailLoading(true)
    try {
      const api = createTenantApi()

      if (invoice.type === 'outbound') {
        const response = await api.getOutboundInvoice(invoice.irn)
        if (response.error) {
          toast.error((response.error as any)?.value?.error || 'Failed to fetch invoice details')
        } else if (response.data?.data) {
          setInvoiceDetails(response.data.data)
          setShowDetailModal(true)
        }
      } else {
        const response = await api.getInboundInvoice(invoice.irn)
        if (response.error) {
          toast.error((response.error as any)?.value?.error || 'Failed to fetch invoice details')
        } else if (response.data?.data) {
          setInvoiceDetails(response.data.data)
          setShowDetailModal(true)
        }
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to fetch invoice details')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    fetchInvoiceDetails(invoice)
  }

  const handleResend = async () => {
    if (!selectedInvoice || selectedInvoice.type !== 'outbound') return

    setResending(true)
    try {
      const api = createTenantApi()
      const response = await api.resendOutboundInvoice(selectedInvoice.irn)

      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to resend invoice')
      } else {
        toast.success('Invoice queued for resend')
        setShowResendDialog(false)
        setSelectedInvoice(null)
        fetchInvoices()
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to resend invoice')
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

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase() || ''
    switch (s) {
      case 'validated':
      case 'signed':
      case 'transmitted':
      case 'acknowledged':
        return <CheckCircle className="w-4 h-4 text-success" />
      case 'pending':
      case 'received':
        return <Clock className="w-4 h-4 text-warning" />
      case 'failed':
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-destructive" />
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />
    }
  }

  const isFailed = (status: string) => {
    const s = status?.toLowerCase() || ''
    return s === 'failed' || s === 'rejected'
  }

  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      sortable: true,
      accessor: (inv) => (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              inv.type === 'outbound' ? 'bg-primary/10' : 'bg-accent/10'
            )}
          >
            {inv.type === 'outbound' ? (
              <ArrowUpRight className="w-5 h-5 text-primary" />
            ) : (
              <ArrowDownLeft className="w-5 h-5 text-accent" />
            )}
          </div>
          <div>
            <p className="font-mono font-medium">{inv.invoiceNumber || inv.irn}</p>
            <p className="text-xs text-muted-foreground capitalize">{inv.type}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      accessor: (inv) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(inv.status)}
          <StatusBadge status={inv.status} />
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      sortable: true,
      accessor: (inv) => (
        <span className="font-semibold">
          {formatAmount(Number(inv.totalAmount), inv.currency)}
        </span>
      ),
    },
    {
      key: 'qrCode',
      header: 'QR Code',
      accessor: (inv) => {
        if (inv.qrCode) {
          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <QrCode className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4">
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={inv.qrCode.toString()}
                    alt="QR Code"
                    className="w-[200px] h-[200px]"
                  />
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Scan to verify invoice
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          )
        }
        return <span className="text-muted-foreground text-xs">&mdash;</span>
      },
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      accessor: (inv) => {
        if (inv.type === 'inbound' && inv.paymentStatus) {
          return <StatusBadge status={inv.paymentStatus} />
        }
        return <span className="text-muted-foreground">&mdash;</span>
      },
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      accessor: (inv) => (
        <div className="text-sm">
          <p className="text-muted-foreground">
            {formatDistanceToNow(new Date(inv.createdAt), { addSuffix: true })}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(inv.createdAt), 'MMM dd, yyyy')}
          </p>
        </div>
      ),
    },
  ]

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    const sorted = [...invoices].sort((a, b) => {
      let aVal: any = a[key as keyof Invoice]
      let bVal: any = b[key as keyof Invoice]

      if (key === 'createdAt' || key === 'issueDate' || key === 'dueDate') {
        aVal = new Date(aVal || 0).getTime()
        bVal = new Date(bVal || 0).getTime()
      } else if (key === 'totalAmount') {
        aVal = Number(aVal || 0)
        bVal = Number(bVal || 0)
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal || '').toLowerCase()
      }

      if (aVal < bVal) return order === 'asc' ? -1 : 1
      if (aVal > bVal) return order === 'asc' ? 1 : -1
      return 0
    })
    setInvoices(sorted)
  }

  const rowActions = (inv: Invoice) => (
    <>
      <DropdownMenuItem onClick={() => handleViewDetails(inv)}>
        <Eye className="w-4 h-4 mr-2" />
        View Details
      </DropdownMenuItem>
      {inv.type === 'outbound' && isFailed(inv.status) && (
        <DropdownMenuItem
          onClick={() => {
            setSelectedInvoice(inv)
            setShowResendDialog(true)
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Resend
        </DropdownMenuItem>
      )}
    </>
  )

  const stats = {
    total: invoices.length,
    outbound: invoices.filter((i) => i.type === 'outbound').length,
    inbound: invoices.filter((i) => i.type === 'inbound').length,
    failed: invoices.filter((i) => isFailed(i.status)).length,
    pending: invoices.filter((i) => i.status?.toLowerCase() === 'pending').length,
  }

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">View and manage your inbound and outbound invoices</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.outbound}</p>
                  <p className="text-sm text-muted-foreground">Outbound</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.inbound}</p>
                  <p className="text-sm text-muted-foreground">Inbound</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.failed}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setPage(1) }}>
          <TabsList>
            <TabsTrigger value="all">All Invoices</TabsTrigger>
            <TabsTrigger value="outbound">Outbound</TabsTrigger>
            <TabsTrigger value="inbound">Inbound</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Data Table */}
        <DataTable
          data={invoices}
          columns={columns}
          searchPlaceholder="Search by invoice number, IRN, customer..."
          filters={transactionFilters}
          rowActions={rowActions}
          isLoading={isLoading}
          currentPage={page}
          totalItems={total}
          onPageChange={setPage}
          onSearch={setSearchQuery}
          onFilterChange={setFilters}
          onSort={handleSort}
          emptyMessage="No transactions found"
        />
      </div>

      {/* Invoice Details Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.type === 'outbound' ? 'Outbound' : 'Inbound'} Invoice - {selectedInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : invoiceDetails ? (
            <ScrollArea className="max-h-[60vh]">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="data">Invoice Data</TabsTrigger>
                  <TabsTrigger value="history">Status History</TabsTrigger>
                  {selectedInvoice?.type === 'outbound' && (
                    <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  {/* QR Code and ERP Section */}
                  {(invoiceDetails.invoice?.qrCode || selectedInvoice?.qrCode || invoiceDetails.invoice?.erp || selectedInvoice?.erp) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border">
                      {(invoiceDetails.invoice?.qrCode || selectedInvoice?.qrCode) && (
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-sm font-medium text-muted-foreground">QR Code</p>
                          <div className="p-3 bg-white rounded-lg border">
                            <img
                              src={(invoiceDetails.invoice?.qrCode || selectedInvoice?.qrCode || '').toString()}
                              alt="QR Code"
                              className="w-[150px] h-[150px]"
                            />
                          </div>
                        </div>
                      )}
                      {(invoiceDetails.invoice?.erp || selectedInvoice?.erp) && (
                        <div className="flex flex-col justify-center gap-2">
                          <p className="text-sm font-medium text-muted-foreground">ERP System</p>
                          <div className="flex items-center gap-2 p-3 bg-background rounded-lg border">
                            <Package className="w-5 h-5 text-primary" />
                            <span className="text-lg font-semibold capitalize">
                              {invoiceDetails.invoice?.erp || selectedInvoice?.erp}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">IRN</p>
                      <p className="font-mono text-sm">{invoiceDetails.invoice?.irn || selectedInvoice?.irn}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <StatusBadge status={invoiceDetails.invoice?.status || selectedInvoice?.status || ''} />
                    </div>
                    {selectedInvoice?.type === 'inbound' && invoiceDetails.invoice?.paymentStatus && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                        <StatusBadge status={invoiceDetails.invoice.paymentStatus} />
                      </div>
                    )}
                    {selectedInvoice?.type === 'inbound' && (
                      <>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Supplier</p>
                          <p className="text-sm">{invoiceDetails.invoice?.supplierName || selectedInvoice?.supplierName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Supplier TIN</p>
                          <p className="text-sm font-mono">{invoiceDetails.invoice?.supplierTIN || selectedInvoice?.supplierTIN || 'N/A'}</p>
                        </div>
                      </>
                    )}
                    {selectedInvoice?.type === 'outbound' && selectedInvoice?.customerName && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Customer</p>
                        <p className="text-sm">{selectedInvoice.customerName}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                      <p className="font-semibold">
                        {formatAmount(
                          invoiceDetails.invoice?.totalAmount || selectedInvoice?.totalAmount || 0,
                          invoiceDetails.invoice?.currency || selectedInvoice?.currency || 'NGN'
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Created</p>
                      <p className="text-sm">
                        {format(new Date(invoiceDetails.invoice?.createdAt || selectedInvoice?.createdAt || Date.now()), 'PPpp')}
                      </p>
                    </div>
                  </div>

                  {selectedInvoice?.type === 'outbound' &&
                    invoiceDetails.invoice?.validationErrors &&
                    invoiceDetails.invoice.validationErrors.length > 0 && (
                      <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="font-medium text-destructive mb-2">Validation Errors</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {invoiceDetails.invoice.validationErrors.map((error: any, idx: number) => (
                            <li key={idx}>{error.message || JSON.stringify(error)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </TabsContent>

                <TabsContent value="data" className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <pre className="text-xs overflow-auto whitespace-pre-wrap">
                      {JSON.stringify(
                        invoiceDetails.invoice?.invoiceData ||
                          invoiceDetails.invoice?.decryptedData ||
                          invoiceDetails.invoice ||
                          {},
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  {invoiceDetails.statusHistory && invoiceDetails.statusHistory.length > 0 ? (
                    <div className="space-y-2">
                      {invoiceDetails.statusHistory.map((history: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                          <div className="flex-1">
                            <p className="font-medium">{history.status || 'Status Change'}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(history.timestamp || Date.now()), 'PPpp')}
                            </p>
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
                </TabsContent>

                {selectedInvoice?.type === 'outbound' && (
                  <TabsContent value="webhooks" className="space-y-4">
                    {invoiceDetails.webhookEvents && invoiceDetails.webhookEvents.length > 0 ? (
                      <div className="space-y-2">
                        {invoiceDetails.webhookEvents.map((event: any, idx: number) => (
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
                  </TabsContent>
                )}
              </Tabs>
            </ScrollArea>
          ) : null}
          <DialogFooter>
            {selectedInvoice?.type === 'outbound' && selectedInvoice && isFailed(selectedInvoice.status) && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowDetailModal(false)
                  setShowResendDialog(true)
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Resend
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resend Confirmation Dialog */}
      <AlertDialog open={showResendDialog} onOpenChange={setShowResendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to resend the invoice{' '}
              <strong>{selectedInvoice?.invoiceNumber || selectedInvoice?.irn}</strong>?
              This will restart the workflow from the beginning.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedInvoice(null)}>Cancel</AlertDialogCancel>
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
