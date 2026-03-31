'use client'

import { Column, DataTable, FilterOption, StatusBadge } from '@/components/shared';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePersistedTab } from '@/hooks/use-persisted-tab';
import { getAdminApiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle, Clock,
  Copy, Download,
  Eye,
  FileText,
  Package, QrCode,
  RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  irn: string;
  invoiceNumber: string;
  type: 'inbound' | 'outbound';
  tenantId?: string;
  tenantName?: string;
  customerName?: string;
  supplierName?: string;
  supplierTIN?: string;
  status: string;
  paymentStatus?: string;
  totalAmount: number;
  currency: string;
  issueDate: Date | string;
  dueDate?: Date | string;
  receivedAt?: Date | string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  workflowState?: any;
  qrCode?: string;
  erpSystem?: string;
  erp?: string;
}

const PAGE_SIZE = 10;

const WORKFLOW_STEP_MAP = [
  { stateKey: 'transformed', apiValue: 'transform', label: 'Transform' },
  { stateKey: 'validated',   apiValue: 'validate',  label: 'Validate'  },
  { stateKey: 'signed',      apiValue: 'sign',       label: 'Sign'      },
  { stateKey: 'transmitted', apiValue: 'transmit',   label: 'Transmit'  },
  { stateKey: 'delivered',   apiValue: 'deliver',    label: 'Deliver'   },
];

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
  {
    key: 'type',
    label: 'Type',
    options: [
      { value: 'all', label: 'All Types' },
      { value: 'outbound', label: 'Outbound' },
      { value: 'inbound', label: 'Inbound' },
    ],
  },
];

export default function AdminTransactionLogs() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [statsData, setStatsData] = useState({ total: 0, outbound: 0, inbound: 0, failed: 0, pending: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = usePersistedTab('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResendDialog, setShowResendDialog] = useState(false);
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const [retryStep, setRetryStep] = useState<string>('validate');
  const [retrying, setRetrying] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState<any>(null);
  const [resending, setResending] = useState(false);

  console.log('invoice details: ', invoiceDetails);
  

  const fetchInvoices = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const api = getAdminApiClient();
      const allInvoices: Invoice[] = [];
      let totalCount = 0;
      let hadError = false;
      let outboundApiTotal = 0;
      let inboundApiTotal = 0;

      const isAllTab = activeTab === 'all';
      const apiLimit = isAllTab ? '100' : pageSize.toString();
      const apiPage = isAllTab ? '1' : page.toString();

      if (isAllTab || activeTab === 'outbound') {
        try {
          const outboundResponse = await api.v1.workflow.invoices.outbound.get({
            query: {
              page: apiPage,
              limit: apiLimit,
              ...(filters.status && filters.status !== 'all' && { status: filters.status }),
              ...(searchQuery && { search: searchQuery }),
            },
          });

          if (outboundResponse.data?.data) {
            const outboundData = outboundResponse.data.data as any[];
            const pagination = outboundResponse.data.pagination;
            outboundData.forEach((invoice: any) => {
              allInvoices.push({
                id: invoice.irn,
                irn: invoice.irn,
                invoiceNumber: invoice.invoiceNumber || invoice.irn,
                type: 'outbound',
                tenantId: invoice.tenantId,
                tenantName: invoice.tenantName,
                status: invoice.status,
                totalAmount: invoice.totalAmount || 0,
                currency: invoice.currency || 'NGN',
                customerName: invoice.customerName,
                issueDate: invoice.createdAt,
                createdAt: invoice.createdAt,
                updatedAt: invoice.updatedAt,
                workflowState: invoice.workflowState,
                qrCode: invoice.qrCode,
                erpSystem: invoice.erp,
                erp: invoice.erp,
              });
            });
            outboundApiTotal = pagination?.total || outboundData.length;
            if (!isAllTab) totalCount += outboundApiTotal;
          } else if (outboundResponse.error) {
            hadError = true;
            console.error('Failed to fetch outbound invoices:', outboundResponse.error);
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            hadError = true;
            console.error('Failed to fetch outbound invoices:', error);
          }
        }
      }

      if (controller.signal.aborted) return;

      if (isAllTab || activeTab === 'inbound') {
        try {
          const inboundResponse = await api.v1.workflow.invoices.inbound.get({
            query: {
              page: apiPage,
              limit: apiLimit,
              ...(filters.status && filters.status !== 'all' && { status: filters.status }),
              ...(filters.paymentStatus && { paymentStatus: filters.paymentStatus }),
              ...(searchQuery && { search: searchQuery }),
            },
          });

          if (inboundResponse.data?.data) {
            const inboundData = inboundResponse.data.data as any[];
            const pagination = inboundResponse.data.pagination;
            inboundData.forEach((invoice: any) => {
              allInvoices.push({
                id: invoice.irn,
                irn: invoice.irn,
                invoiceNumber: invoice.invoiceNumber || invoice.irn,
                type: 'inbound',
                tenantId: invoice.tenantId,
                tenantName: invoice.tenantName,
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
              });
            });
            inboundApiTotal = pagination?.total || inboundData.length;
            if (!isAllTab) totalCount += inboundApiTotal;
          } else if (inboundResponse.error) {
            hadError = true;
            console.error('Failed to fetch inbound invoices:', inboundResponse.error);
          }
        } catch (error) {
          if (!controller.signal.aborted) {
            hadError = true;
            console.error('Failed to fetch inbound invoices:', error);
          }
        }
      }

      if (controller.signal.aborted) return;

      // Client-side type filter (for 'all' tab)
      let filtered = allInvoices;
      if (filters.type && filters.type !== 'all') {
        filtered = allInvoices.filter(inv => inv.type === filters.type);
      }

      if (hadError && allInvoices.length === 0) {
        toast.error('Failed to load transactions. Please try refreshing.');
      }

      // Stats from API-reported totals — independent of page/pageSize
      setStatsData({
        total: outboundApiTotal + inboundApiTotal,
        outbound: outboundApiTotal,
        inbound: inboundApiTotal,
        failed: allInvoices.filter(i => { const s = (i.status || '').toLowerCase(); return s === 'failed' || s === 'rejected'; }).length,
        pending: allInvoices.filter(i => i.status?.toLowerCase() === 'pending').length,
      });

      // Client-side pagination slice for 'all' tab; server paginates for single-type tabs
      const displayInvoices = isAllTab
        ? filtered.slice((page - 1) * pageSize, page * pageSize)
        : filtered;
      setInvoices(displayInvoices);
      setTotal(isAllTab ? filtered.length : totalCount || filtered.length);
    } catch (error: any) {
      if (!controller.signal.aborted) {
        toast.error(error?.message || 'Failed to load transactions');
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [page, pageSize, searchQuery, filters, activeTab]);

  // Re-fetch when params or manual refresh trigger changes; abort on cleanup
  useEffect(() => {
    fetchInvoices();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchInvoices, refreshTrigger]);

  // Auto-refresh every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger(n => n + 1);
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchInvoiceDetails = async (invoice: Invoice) => {
    setDetailLoading(true);
    try {
      const api = getAdminApiClient();
      if (invoice.type === 'outbound') {
        const response = await api.v1.workflow.invoices.outbound({ irn: invoice.irn }).get();
        if (response.error) {
          toast.error((response.error as any)?.value?.error || 'Failed to fetch invoice details');
        } else if (response.data?.data) {
          const data = response.data.data;
          setInvoiceDetails(data);
          setInvoices(prev => prev.map(inv => {
            if (inv.irn === invoice.irn) {
              const qrCode = data.invoice?.qrCode
                ? (typeof data.invoice.qrCode === 'string' ? data.invoice.qrCode : String(data.invoice.qrCode))
                : inv.qrCode;
              return { ...inv, qrCode };
            }
            return inv;
          }));
          setShowDetailModal(true);
        }
      } else {
        const response = await api.v1.workflow.invoices.inbound({ irn: invoice.irn }).get();
        if (response.error) {
          toast.error((response.error as any)?.value?.error || 'Failed to fetch invoice details');
        } else if (response.data?.data) {
          setInvoiceDetails(response.data.data);
          setShowDetailModal(true);
        }
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to fetch invoice details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    fetchInvoiceDetails(invoice);
  };

  const handleResend = async () => {
    if (!selectedInvoice || selectedInvoice.type !== 'outbound') return;
    setResending(true);
    try {
      const api = getAdminApiClient();
      const response = await api.v1.workflow.invoices.outbound({ irn: selectedInvoice.irn }).resend.post({});
      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to resend invoice');
      } else {
        toast.success('Invoice queued for resend');
        setShowResendDialog(false);
        setSelectedInvoice(null);
        setRefreshTrigger(n => n + 1);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to resend invoice');
    } finally {
      setResending(false);
    }
  };

  const handleRetryFromStep = async () => {
    if (!selectedInvoice || selectedInvoice.type !== 'outbound') return;
    setRetrying(true);
    try {
      const api = getAdminApiClient();
      const response = await api.v1.workflow.invoices.outbound({ irn: selectedInvoice.irn })['retry-from-step'].post({ fromStep: retryStep });
      if (response.error) {
        toast.error((response.error as any)?.value?.error || 'Failed to retry invoice');
      } else {
        toast.success(`Invoice queued to retry from ${retryStep}`);
        setShowRetryDialog(false);
        setSelectedInvoice(null);
        setRefreshTrigger(n => n + 1);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to retry invoice');
    } finally {
      setRetrying(false);
    }
  };

  const downloadQrCode = (qrCode: string, filename = 'qrcode') => {
    const a = document.createElement('a');
    a.href = qrCode;
    a.download = `${filename}.png`;
    a.click();
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency || 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase() || '';
    switch (s) {
      case 'validated': case 'signed': case 'transmitted': case 'acknowledged':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'pending': case 'received':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'failed': case 'rejected':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const isFailed = (status: string) => {
    const s = status?.toLowerCase() || '';
    return s === 'failed' || s === 'rejected';
  };

  const hasIncompleteSteps = (workflowState: any) => {
    if (!workflowState) return false;
    return WORKFLOW_STEP_MAP.some(s => !workflowState[s.stateKey]);
  };

  const hasJobError = (inv: Invoice) => {
    if (inv.type !== 'outbound') return false;
    const ws = inv.workflowState;
    if (!ws) return false;
    return !!(ws.error || ws.jobError || ws.failed);
  };

  const columns: Column<Invoice>[] = [
    {
      key: 'irn',
      header: 'IRN',
      sortable: true,
      accessor: (inv) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
            inv.type === 'outbound' ? 'bg-primary/10' : 'bg-accent/10'
          )}>
            {inv.type === 'outbound'
              ? <ArrowUpRight className="w-5 h-5 text-primary" />
              : <ArrowDownLeft className="w-5 h-5 text-accent" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-mono font-medium text-sm truncate max-w-[120px]" title={inv.invoiceNumber || inv.irn}>
                {(inv.invoiceNumber || inv.irn).slice(0, 12)}…
              </p>
              <button
                className="text-muted-foreground hover:text-foreground shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(inv.irn);
                  toast.success('IRN copied');
                }}
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
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
    // {
    //   key: 'customerName',
    //   header: 'Counterparty',
    //   sortable: true,
    //   accessor: (inv) => {
    //     const name = inv.type === 'outbound' ? inv.customerName : inv.supplierName;
    //     const sub = inv.type === 'inbound' && inv.supplierTIN ? inv.supplierTIN : null;
    //     if (!name) return <span className="text-muted-foreground text-xs">&mdash;</span>;
    //     return (
    //       <div className="min-w-0">
    //         <p className="text-sm font-medium truncate max-w-[160px]" title={name}>{name}</p>
    //         {sub && <p className="text-xs text-muted-foreground">TIN: {sub}</p>}
    //         {inv.tenantName && (
    //           <p className="text-xs text-muted-foreground truncate max-w-[160px]">Tenant: {inv.tenantName}</p>
    //         )}
    //       </div>
    //     );
    //   },
    // },
    {
      key: 'qrCode',
      header: 'QR Code',
      className: 'hidden lg:table-cell',
      accessor: (inv) => {
        if (inv.qrCode) {
          return (
            <div onClick={(e) => e.stopPropagation()}>
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
                    <p className="text-xs text-muted-foreground text-center">
                      Scan to verify invoice
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => downloadQrCode(inv.qrCode!, inv.irn)}
                    >
                      <Download className="w-3 h-3 mr-2" />
                      Download
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          );
        }
        return <span className="text-muted-foreground text-xs">&mdash;</span>;
      },
    },
    {
      key: 'erpSystem',
      header: 'ERP',
      sortable: true,
      className: 'hidden md:table-cell',
      accessor: (inv) => {
        const erp = inv.erpSystem || inv.erp;
        if (erp) {
          return (
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              {erp}
            </Badge>
          );
        }
        return <span className="text-muted-foreground text-xs">&mdash;</span>;
      },
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      className: 'hidden sm:table-cell',
      accessor: (inv) => (
        <div className="text-sm">
          <p className="font-medium">{format(new Date(inv.createdAt), 'MMM dd, yyyy')}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(inv.createdAt), 'hh:mm a')}</p>
        </div>
      ),
    },
  ];

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    const sorted = [...invoices].sort((a, b) => {
      let aVal: any = a[key as keyof Invoice];
      let bVal: any = b[key as keyof Invoice];
      if (key === 'createdAt' || key === 'issueDate') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
    setInvoices(sorted);
  };

  const rowActions = (inv: Invoice) => (
    <>
      <DropdownMenuItem onClick={() => handleViewDetails(inv)}>
        <Eye className="w-4 h-4 mr-2" />
        View Details
      </DropdownMenuItem>
      {inv.qrCode && (
        <DropdownMenuItem onClick={() => downloadQrCode(inv.qrCode!, inv.irn)}>
          <Download className="w-4 h-4 mr-2" />
          Download QR Code
        </DropdownMenuItem>
      )}
      {inv.type === 'outbound' && (hasJobError(inv) || hasIncompleteSteps(inv.workflowState)) && (
        <DropdownMenuSeparator />
      )}
      {inv.type === 'outbound' && hasJobError(inv) && (
        <DropdownMenuItem
          onClick={() => {
            setSelectedInvoice(inv);
            setShowResendDialog(true);
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Resend Invoice
        </DropdownMenuItem>
      )}
      {inv.type === 'outbound' && hasIncompleteSteps(inv.workflowState) && (
        <DropdownMenuItem
          onClick={() => {
            const firstIncomplete = WORKFLOW_STEP_MAP.find(s => !inv.workflowState?.[s.stateKey]);
            setSelectedInvoice(inv);
            setRetryStep(firstIncomplete?.apiValue ?? 'validate');
            setShowRetryDialog(true);
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry from Step
        </DropdownMenuItem>
      )}
    </>
  );

  const stats = statsData;

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Transaction Logs</h1>
            <p className="page-subtitle">View and manage all inbound and outbound invoices</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { abortRef.current?.abort(); setRefreshTrigger(n => n + 1); }}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{stats.outbound}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Outbound</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{stats.inbound}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Inbound</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold">{stats.failed}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setPage(1); }}>
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
          searchPlaceholder="Search by invoice number, IRN, counterparty..."
          filters={transactionFilters}
          rowActions={rowActions}
          isLoading={isLoading}
          currentPage={page}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
          onSearch={(q) => { setSearchQuery(q); setPage(1); }}
          onFilterChange={(f) => { setFilters(f); setPage(1); }}
          onSort={handleSort}
          onRowClick={handleViewDetails}
          emptyMessage="No transactions found"
        />
      </div>

      {/* Invoice Details Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.type === 'outbound' ? 'Outbound' : 'Inbound'} Invoice — {selectedInvoice?.invoiceNumber || selectedInvoice?.irn}
              {selectedInvoice?.tenantName && ` · ${selectedInvoice.tenantName}`}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : invoiceDetails ? (
            <ScrollArea className="max-h-[65vh]">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full flex overflow-x-auto">
                  <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
                  <TabsTrigger value="data" className="text-xs sm:text-sm">Invoice Data</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs sm:text-sm">History</TabsTrigger>
                  {selectedInvoice?.type === 'outbound' && (
                    <TabsTrigger value="webhooks" className="text-xs sm:text-sm">Webhooks</TabsTrigger>
                  )}
                </TabsList>

                {/* OVERVIEW */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                  {/* Workflow State Pipeline */}
                  {invoiceDetails.invoice?.workflowState && (
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <p className="text-xs font-medium text-muted-foreground mb-3">Workflow Progress</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {WORKFLOW_STEP_MAP.map((s, idx, arr) => {
                          const done = !!invoiceDetails.invoice.workflowState[s.stateKey];
                          return (
                            <div key={s.stateKey} className="flex items-center gap-1">
                              <div className={cn(
                                'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium',
                                done ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'
                              )}>
                                {done ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                <span className="capitalize">{s.stateKey}</span>
                              </div>
                              {idx < arr.length - 1 && (
                                <div className={cn('h-px w-4', done ? 'bg-success/40' : 'bg-border')} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* QR Code */}
                  {(invoiceDetails.invoice?.qrCode || selectedInvoice?.qrCode) && (
                    <div className="flex flex-col items-center gap-2 p-4 bg-muted/50 rounded-lg border w-fit">
                      <p className="text-xs font-medium text-muted-foreground">QR Code</p>
                      <div className="p-2 bg-white rounded border">
                        <img
                          src={(invoiceDetails.invoice?.qrCode || selectedInvoice?.qrCode || '').toString()}
                          alt="QR Code"
                          className="w-[140px] h-[140px]"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => downloadQrCode(
                          (invoiceDetails.invoice?.qrCode || selectedInvoice?.qrCode || '').toString(),
                          selectedInvoice?.irn || 'qrcode'
                        )}
                      >
                        <Download className="w-3 h-3 mr-2" />
                        Download QR Code
                      </Button>
                    </div>
                  )}

                  {/* Core fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">IRN</p>
                      <p className="font-mono text-xs break-all">{invoiceDetails.invoice?.irn || selectedInvoice?.irn}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <StatusBadge status={invoiceDetails.invoice?.status || selectedInvoice?.status || ''} />
                    </div>
                    {selectedInvoice?.tenantName && (
                      <div>
                        <p className="text-xs text-muted-foreground">Tenant</p>
                        <p className="text-sm font-medium">{selectedInvoice.tenantName}</p>
                      </div>
                    )}
                    {invoiceDetails.invoice?.paymentStatus && (
                      <div>
                        <p className="text-xs text-muted-foreground">Payment Status</p>
                        <StatusBadge status={invoiceDetails.invoice.paymentStatus} />
                      </div>
                    )}
                    {(invoiceDetails.invoice?.erp || selectedInvoice?.erpSystem) && (
                      <div>
                        <p className="text-xs text-muted-foreground">ERP System</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Package className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium capitalize">
                            {(invoiceDetails.invoice?.erp || selectedInvoice?.erpSystem || '').replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    )}
                    {invoiceDetails.invoice?.validationAttempts !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground">Validation Attempts</p>
                        <p className="text-sm font-medium">{invoiceDetails.invoice.validationAttempts}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm">{format(new Date(invoiceDetails.invoice?.createdAt || selectedInvoice?.createdAt || Date.now()), 'PPpp')}</p>
                    </div>
                    {invoiceDetails.invoice?.updatedAt && (
                      <div>
                        <p className="text-xs text-muted-foreground">Last Updated</p>
                        <p className="text-sm">{format(new Date(invoiceDetails.invoice.updatedAt), 'PPpp')}</p>
                      </div>
                    )}
                  </div>

                  {/* Validation Errors */}
                  {invoiceDetails.invoice?.validationErrors?.length > 0 && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm font-medium text-destructive mb-2">Validation Errors</p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-foreground">
                        {invoiceDetails.invoice.validationErrors.map((err: any, idx: number) => (
                          <li key={idx}>{err.message || err.error || JSON.stringify(err)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Last Job Error */}
                  {invoiceDetails.invoice?.lastJobError && Object.keys(invoiceDetails.invoice.lastJobError).length > 0 && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm font-medium text-destructive mb-1">Last Job Error</p>
                      <pre className="text-xs text-foreground overflow-auto whitespace-pre-wrap">
                        {JSON.stringify(invoiceDetails.invoice.lastJobError, null, 2)}
                      </pre>
                    </div>
                  )}
                </TabsContent>

                {/* INVOICE DATA */}
                <TabsContent value="data" className="space-y-4 mt-4">
                  {(() => {
                    const payload =
                      invoiceDetails.invoice?.invoiceData ||
                      invoiceDetails.invoice?.decryptedData ||
                      invoiceDetails.invoice?.invoice ||
                      invoiceDetails.webhookEvents?.[0]?.payload?.data ||
                      invoiceDetails.webhookEvents?.[0]?.payload;
                    const rawJson = JSON.stringify(invoiceDetails.invoice || invoiceDetails, null, 2);

                    if (!payload) {
                      return (
                        <div className="space-y-2">
                          <div className="flex justify-end">
                            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(rawJson); toast.success('Raw data copied'); }}>
                              <Copy className="w-3.5 h-3.5 mr-1.5" />
                              Copy Raw
                            </Button>
                          </div>
                          <div className="p-4 bg-muted rounded-lg">
                            <pre className="text-xs overflow-auto whitespace-pre-wrap">{rawJson}</pre>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(rawJson); toast.success('Raw data copied'); }}>
                            <Copy className="w-3.5 h-3.5 mr-1.5" />
                            Copy Raw
                          </Button>
                        </div>
                        {/* Invoice header */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg border">
                          {payload.invoice_number && (
                            <div>
                              <p className="text-xs text-muted-foreground">Invoice Number</p>
                              <p className="text-sm font-mono font-medium">{payload.invoice_number}</p>
                            </div>
                          )}
                          {payload.invoice_type_code && (
                            <div>
                              <p className="text-xs text-muted-foreground">Type</p>
                              <p className="text-sm capitalize">{payload.invoice_type_code}</p>
                            </div>
                          )}
                          {payload.document_currency_code && (
                            <div>
                              <p className="text-xs text-muted-foreground">Currency</p>
                              <p className="text-sm font-medium">{payload.document_currency_code}</p>
                            </div>
                          )}
                          {payload.issue_date && (
                            <div>
                              <p className="text-xs text-muted-foreground">Issue Date</p>
                              <p className="text-sm">{format(new Date(payload.issue_date), 'PP')}</p>
                            </div>
                          )}
                          {payload.due_date && (
                            <div>
                              <p className="text-xs text-muted-foreground">Due Date</p>
                              <p className="text-sm">{format(new Date(payload.due_date), 'PP')}</p>
                            </div>
                          )}
                          {payload.firs_validated !== undefined && (
                            <div>
                              <p className="text-xs text-muted-foreground">NRS Validated</p>
                              <p className="text-sm">{payload.firs_validated ? 'Yes' : 'No'}</p>
                            </div>
                          )}
                        </div>

                        {/* Monetary totals */}
                        {payload.legal_monetary_total && (
                          <div className="p-4 bg-muted/50 rounded-lg border">
                            <p className="text-xs font-medium text-muted-foreground mb-3">Monetary Totals</p>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                ['Payable Amount', payload.legal_monetary_total.payable_amount],
                                ['Tax Exclusive', payload.legal_monetary_total.tax_exclusive_amount],
                                ['Tax Inclusive', payload.legal_monetary_total.tax_inclusive_amount],
                                ['Line Extension', payload.legal_monetary_total.line_extension_amount],
                              ].map(([label, val]) => val !== undefined && (
                                <div key={label as string}>
                                  <p className="text-xs text-muted-foreground">{label}</p>
                                  <p className="text-sm font-semibold">
                                    {formatAmount(Number(val), payload.document_currency_code || 'NGN')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Parties */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {payload.accounting_supplier_party && (
                            <div className="p-4 border rounded-lg space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Supplier</p>
                              <p className="text-sm font-medium">{payload.accounting_supplier_party.party_name}</p>
                              {payload.accounting_supplier_party.tin && <p className="text-xs text-muted-foreground">TIN: <span className="font-mono text-foreground">{payload.accounting_supplier_party.tin}</span></p>}
                              {payload.accounting_supplier_party.email && <p className="text-xs text-muted-foreground">Email: {payload.accounting_supplier_party.email}</p>}
                              {payload.accounting_supplier_party.telephone && <p className="text-xs text-muted-foreground">Phone: {payload.accounting_supplier_party.telephone}</p>}
                              {payload.accounting_supplier_party.postal_address && (
                                <p className="text-xs text-muted-foreground">
                                  {[
                                    payload.accounting_supplier_party.postal_address.street_name,
                                    payload.accounting_supplier_party.postal_address.city_name,
                                    payload.accounting_supplier_party.postal_address.country,
                                  ].filter(Boolean).join(', ')}
                                </p>
                              )}
                            </div>
                          )}
                          {payload.accounting_customer_party && (
                            <div className="p-4 border rounded-lg space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</p>
                              <p className="text-sm font-medium">{payload.accounting_customer_party.party_name}</p>
                              {payload.accounting_customer_party.tin && <p className="text-xs text-muted-foreground">TIN: <span className="font-mono text-foreground">{payload.accounting_customer_party.tin}</span></p>}
                              {payload.accounting_customer_party.email && <p className="text-xs text-muted-foreground">Email: {payload.accounting_customer_party.email}</p>}
                              {payload.accounting_customer_party.telephone && <p className="text-xs text-muted-foreground">Phone: {payload.accounting_customer_party.telephone}</p>}
                              {payload.accounting_customer_party.postal_address && (
                                <p className="text-xs text-muted-foreground">
                                  {[
                                    payload.accounting_customer_party.postal_address.street_name,
                                    payload.accounting_customer_party.postal_address.city_name,
                                    payload.accounting_customer_party.postal_address.country,
                                  ].filter(Boolean).join(', ')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Line items */}
                        {payload.invoice_line?.length > 0 && (
                          <div className="border rounded-lg overflow-hidden">
                            <p className="text-xs font-medium text-muted-foreground px-4 py-2 bg-muted/50 border-b">Line Items</p>
                            <div className="divide-y">
                              {payload.invoice_line.map((line: any, idx: number) => (
                                <div key={idx} className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                  <div>
                                    <p className="text-muted-foreground">Item</p>
                                    <p className="font-medium">{line.item?.name || '—'}</p>
                                    {line.item?.description && <p className="text-muted-foreground">{line.item.description}</p>}
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Qty</p>
                                    <p className="font-medium">{line.invoiced_quantity}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Unit Price</p>
                                    <p className="font-medium">{formatAmount(Number(line.price?.price_amount || 0), payload.document_currency_code || 'NGN')}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Line Total</p>
                                    <p className="font-semibold">{formatAmount(Number(line.line_extension_amount || 0), payload.document_currency_code || 'NGN')}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* STATUS HISTORY */}
                <TabsContent value="history" className="space-y-4 mt-4">
                  {invoiceDetails.statusHistory?.length > 0 ? (
                    <div className="relative pl-4 space-y-0">
                      {invoiceDetails.statusHistory.map((entry: any, idx: number) => (
                        <div key={idx} className="flex gap-3">
                          {/* timeline */}
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              'w-2.5 h-2.5 rounded-full shrink-0 mt-3.5',
                              entry.status === 'failed' ? 'bg-destructive' : 'bg-success'
                            )} />
                            {idx < invoiceDetails.statusHistory.length - 1 && (
                              <div className="w-px flex-1 bg-border" />
                            )}
                          </div>
                          <div className={cn(
                            'flex-1 p-3 border rounded-lg space-y-2 mb-1',
                            entry.status === 'failed'
                              ? 'border-destructive/30 bg-destructive/5'
                              : 'border-border bg-muted/20'
                          )}>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-sm font-semibold capitalize">
                                {`Step ${idx + 1}: ${(entry.step || 'status change').replace(/_/g, ' ')}`}
                              </p>
                              <StatusBadge status={entry.status || 'unknown'} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                              {entry.at && (
                                <div>
                                  <span className="text-muted-foreground">Time: </span>
                                  <span>{format(new Date(entry.at), 'MMM dd, yyyy · hh:mm:ss a')}</span>
                                </div>
                              )}
                            </div>
                            {entry.error && (
                              <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-foreground">
                                <span className="font-medium text-destructive">Error: </span>
                                {entry.error}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8 text-sm">No status history available</p>
                  )}
                </TabsContent>

                {/* WEBHOOKS */}
                {selectedInvoice?.type === 'outbound' && (
                  <TabsContent value="webhooks" className="space-y-4 mt-4">
                    {invoiceDetails.webhookEvents?.length > 0 ? (
                      <div className="space-y-4">
                        {invoiceDetails.webhookEvents.map((event: any, idx: number) => (
                          <div key={idx} className={cn(
                            'border rounded-lg overflow-hidden',
                            event.status === 'failed' ? 'border-destructive/30' : 'border-border'
                          )}>
                            <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b flex-wrap gap-2">
                              <div className="space-y-0.5">
                                <p className="text-sm font-medium">{event.eventType || 'Webhook Event'}</p>
                                {event.eventId && <p className="text-xs font-mono text-muted-foreground">{event.eventId}</p>}
                              </div>
                              <StatusBadge status={event.status || 'pending'} />
                            </div>
                            <div className="px-4 py-3 space-y-3">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                {event.receivedAt && (
                                  <div>
                                    <p className="text-muted-foreground">Received</p>
                                    <p>{format(new Date(event.receivedAt), 'PPpp')}</p>
                                  </div>
                                )}
                                {event.deliveredAt && (
                                  <div>
                                    <p className="text-muted-foreground">Delivered</p>
                                    <p>{format(new Date(event.deliveredAt), 'PPpp')}</p>
                                  </div>
                                )}
                                {event.failedAt && (
                                  <div>
                                    <p className="text-muted-foreground">Failed At</p>
                                    <p className="text-destructive font-medium">{format(new Date(event.failedAt), 'PPpp')}</p>
                                  </div>
                                )}
                              </div>
                              {event.failureReason && (
                                <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs">
                                  <p className="font-medium text-destructive mb-0.5">Failure Reason</p>
                                  <p className="text-foreground">{event.failureReason}</p>
                                </div>
                              )}
                              {event.jobErrors?.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-destructive mb-1.5">Job Errors</p>
                                  <div className="space-y-2">
                                    {event.jobErrors.map((jobErr: any, jIdx: number) => (
                                      <div key={jIdx} className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs space-y-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                          <span className="font-medium text-foreground">Step {jobErr.step}: {jobErr.action}</span>
                                          {jobErr.failedAt && (
                                            <span className="text-muted-foreground">{format(new Date(jobErr.failedAt), 'PPpp')}</span>
                                          )}
                                        </div>
                                        <p className="text-foreground">{jobErr.error}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8 text-sm">No webhook events available</p>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </ScrollArea>
          ) : null}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedInvoice && hasJobError(selectedInvoice) && (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setShowDetailModal(false);
                  setShowResendDialog(true);
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Resend Invoice
              </Button>
            )}
            {selectedInvoice?.type === 'outbound' && hasIncompleteSteps(invoiceDetails?.invoice?.workflowState ?? selectedInvoice?.workflowState) && (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  const ws = invoiceDetails?.invoice?.workflowState ?? selectedInvoice?.workflowState;
                  const firstIncomplete = WORKFLOW_STEP_MAP.find(s => !ws?.[s.stateKey]);
                  setShowDetailModal(false);
                  setRetryStep(firstIncomplete?.apiValue ?? 'validate');
                  setShowRetryDialog(true);
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry from Step
              </Button>
            )}
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retry from Step Dialog */}
      <Dialog open={showRetryDialog} onOpenChange={setShowRetryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Retry from Step</DialogTitle>
            <DialogDescription>
              Resume the failed workflow for invoice{' '}
              <strong>{selectedInvoice?.invoiceNumber || selectedInvoice?.irn}</strong> from a specific step.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Start from step</Label>
            <Select value={retryStep} onValueChange={setRetryStep}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(selectedInvoice?.workflowState
                  ? WORKFLOW_STEP_MAP.filter(s => !selectedInvoice.workflowState![s.stateKey])
                  : WORKFLOW_STEP_MAP
                ).map(s => (
                  <SelectItem key={s.apiValue} value={s.apiValue}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The invoice will be reprocessed starting from the selected step, skipping any steps before it.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRetryDialog(false); setSelectedInvoice(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleRetryFromStep}
              disabled={retrying}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {retrying ? 'Retrying...' : 'Retry'}
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
              Are you sure you want to resend invoice{' '}
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
  );
}
