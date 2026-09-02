"use client";

import {
  Column,
  DataTable,
  FilterOption,
  StatusBadge,
} from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";
import { usePersistedTab } from "@/hooks/use-persisted-tab";
import { createTenantApi } from "@/lib/api/tenant-api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Copy,
  CreditCard,
  Download,
  Eye,
  FileText,
  Package,
  QrCode,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type PaymentStatus = "pending" | "paid" | "rejected" | "cancelled";
export interface Invoice {
  id: string;
  irn: string;
  invoiceNumber: string;
  type: "inbound" | "outbound";
  customerName?: string;
  supplierName?: string;
  supplierTIN?: string;
  status: string;
  paymentStatus?: PaymentStatus;
  lastJobError?: {
    action: string;
    error: string;
    failedAt: string;
  };
  tenantId?: string;
  tenantName?: string;
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
  hasRoutingError?: boolean;
}

const OUTBOUND_STATUS_OPTIONS = [
  { value: "CREATED", label: "Created" },
  { value: "VALIDATED", label: "Validated" },
  { value: "SIGNED", label: "Signed" },
  { value: "TRANSMITTED", label: "Transmitted" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "FAILED", label: "Failed" },
  { value: "TRANSMISSION_FAILED", label: "Transmission Failed" },
  { value: "PAID", label: "Paid" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELED", label: "Canceled" },
];

const INBOUND_STATUS_OPTIONS = [
  { value: "ACKNOWLEDGED", label: "Acknowledged" },
  { value: "DOWNLOADED", label: "Downloaded" },
  { value: "SYNCED_TO_ERP", label: "Synced to ERP" },
  { value: "FAILED", label: "Failed" },
  { value: "PAID", label: "Paid" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELED", label: "Canceled" },
];

const ALL_STATUS_OPTIONS = [
  { value: "CREATED", label: "Created" },
  { value: "VALIDATED", label: "Validated" },
  { value: "SIGNED", label: "Signed" },
  { value: "TRANSMITTED", label: "Transmitted" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "FAILED", label: "Failed" },
  { value: "TRANSMISSION_FAILED", label: "Transmission Failed" },
  { value: "ACKNOWLEDGED", label: "Acknowledged" },
  { value: "DOWNLOADED", label: "Downloaded" },
  { value: "SYNCED_TO_ERP", label: "Synced to ERP" },
  { value: "PAID", label: "Paid" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELED", label: "Canceled" },
];

const PAGE_SIZE = 10;

export default function TransactionsPage() {
  const { hasPermission } = usePermissions();
  const canResend = hasPermission("transactions:resend");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [statsData, setStatsData] = useState({
    total: 0,
    outbound: 0,
    inbound: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = usePersistedTab("all");

  const transactionFilters: FilterOption[] = useMemo(() => {
    const statusOptions =
      activeTab === "outbound" ? OUTBOUND_STATUS_OPTIONS
      : activeTab === "inbound" ? INBOUND_STATUS_OPTIONS
      : ALL_STATUS_OPTIONS;
    return [
      {
        key: "status",
        label: "Status",
        options: [{ value: "all", label: "All Invoice Statuses" }, ...statusOptions],
      },
    ];
  }, [activeTab]);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResendDialog, setShowResendDialog] = useState(false);
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const [retryStep, setRetryStep] = useState<string>("validate");
  const [retrying, setRetrying] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<any>(null);
  const [eventRoutes, setEventRoutes] = useState<any[]>([]);
  const [resending, setResending] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Payment status update
  const [showPaymentStatusDialog, setShowPaymentStatusDialog] = useState(false);
  const [updatingPaymentStatus, setUpdatingPaymentStatus] = useState(false);
  const [paymentStatusForm, setPaymentStatusForm] = useState({
    status: "PENDING",
    paymentDate: "",
    paymentAmount: "",
    paymentReference: "",
    rejectionReason: "",
  });

  const fetchInvoices = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const api = createTenantApi();

      const response = await api.getInvoices({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(activeTab !== "all" && { type: activeTab }),
        ...(filters.status &&
          filters.status !== "all" && { status: filters.status }),
        ...(searchQuery && { search: searchQuery }),
      });

      if (controller.signal.aborted) return;

      if (response.error) {
        toast.error("Failed to load transactions. Please try refreshing.");
        return;
      }

      const data = ((response.data as any)?.data as any[]) ?? [];
      const meta = (response.data as any)?.meta;
      const pagination = (response.data as any)?.pagination;

      const mapped: Invoice[] = data.map((invoice: any) => ({
        id: invoice.irn,
        irn: invoice.irn,
        invoiceNumber: invoice.invoiceNumber || invoice.irn,
        type: (invoice.type || "outbound") as "inbound" | "outbound",
        status: invoice.status,
        lastJobError: {
          action: invoice.lastJobError?.action,
          error: invoice.lastJobError?.error,
          failedAt: invoice.lastJobError?.failedAt,
        },
        paymentStatus: invoice.paymentStatus,
        totalAmount: invoice.totalAmount || 0,
        currency: invoice.currency || "NGN",
        customerName: invoice.customerName,
        supplierName: invoice.supplierName,
        supplierTIN: invoice.supplierTIN,
        issueDate: invoice.issueDate || invoice.createdAt,
        dueDate: invoice.dueDate,
        receivedAt: invoice.receivedAt,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        workflowState: invoice.workflowState,
        qrCode: invoice.qrCode,
        erp: invoice.erp,
      }));

      setInvoices(mapped);
      setTotal(pagination?.total ?? mapped.length);
    } catch (error: any) {
      if (!controller.signal.aborted) {
        toast.error(error?.message || "Failed to load transactions");
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, searchQuery, filters, activeTab]);

  const fetchMetrics = useCallback(async () => {
    try {
      const api = createTenantApi();
      const res = await api.getInvoiceMetrics();
      if (!res.error) {
        const data = (res.data as any)?.data;
        setStatsData({
          total: data?.total ?? 0,
          outbound: data?.outbound ?? 0,
          inbound: data?.inbound ?? 0,
        });
      }
    } catch {
      // non-critical
    }
  }, []);

  // Re-fetch when params or manual refresh trigger changes; abort on cleanup
  useEffect(() => {
    fetchInvoices();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchInvoices, refreshTrigger]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics, refreshTrigger]);

  // Auto-refresh every 15 minutes
  useEffect(() => {
    const interval = setInterval(
      () => setRefreshTrigger((n) => n + 1),
      15 * 60 * 1000,
    );
    return () => clearInterval(interval);
  }, []);

  const fetchInvoiceDetails = async (invoice: Invoice) => {
    setDetailLoading(true);
    setDetailError(null);
    setInvoiceDetails(null);
    try {
      const api = createTenantApi();

      if (invoice.type === "outbound") {
        const response = await api.getOutboundInvoice(invoice.irn);
        if (response.error) {
          setDetailError(
            (response.error as any)?.value?.error || "Failed to fetch invoice details",
          );
        } else if (response.data?.data) {
          const data = response.data.data;

          // Fetch current event routing config to check against webhook event types
          let fetchedRoutes: any[] = [];
          const tenantId = data.invoice?.tenantId;
          if (tenantId) {
            try {
              const routesRes = await api.getEventRouting(tenantId);
              if (!routesRes.error && (routesRes.data as any)?.data?.routes) {
                fetchedRoutes = (routesRes.data as any).data.routes;
              }
            } catch {
              /* non-critical, fall back to no routing check */
            }
          }
          setEventRoutes(fetchedRoutes);
          setInvoices((prev) =>
            prev.map((inv) =>
              inv.irn === invoice.irn
                ? {
                    ...inv,
                    hasRoutingError: hasUnroutedWebhookEvent(
                      data.webhookEvents,
                      fetchedRoutes,
                      data.invoice?.status,
                    ),
                  }
                : inv,
            ),
          );
          setInvoiceDetails(data);
        }
      } else {
        setEventRoutes([]);
        const response = await api.getInboundInvoice(invoice.irn);
        if (response.error) {
          setDetailError(
            (response.error as any)?.value?.error || "Failed to fetch invoice details",
          );
        } else if (response.data?.data) {
          setInvoiceDetails(response.data.data);
        }
      }
    } catch (error: any) {
      setDetailError(error?.message || "Failed to fetch invoice details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceDetails(null);
    setDetailError(null);
    setShowDetailModal(true);
    fetchInvoiceDetails(invoice);
  };

  const handleResend = async () => {
    if (!selectedInvoice || selectedInvoice.type !== "outbound") return;

    setResending(true);
    try {
      const api = createTenantApi();
      const response = await api.resendOutboundInvoice(selectedInvoice.irn);

      if (response.error) {
        toast.error(
          (response.error as any)?.value?.error || "Failed to resend invoice",
        );
      } else {
        toast.success("Invoice queued for resend");
        setShowResendDialog(false);
        setSelectedInvoice(null);
        fetchInvoices();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to resend invoice");
    } finally {
      setResending(false);
    }
  };

  const handleRetryFromStep = async () => {
    if (!selectedInvoice || selectedInvoice.type !== "outbound") return;

    setRetrying(true);
    try {
      const api = createTenantApi();
      const response = await api.retryFromStep(selectedInvoice.irn, retryStep);

      if (response.error) {
        toast.error(
          (response.error as any)?.value?.error || "Failed to retry invoice",
        );
      } else {
        toast.success(`Invoice queued to retry from "${retryStep}" step`);
        setShowRetryDialog(false);
        setSelectedInvoice(null);
        fetchInvoices();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to retry invoice");
    } finally {
      setRetrying(false);
    }
  };

  const TERMINAL_SUCCESS_STATUSES = [
    "DELIVERED",
    "ACKNOWLEDGED",
    "DOWNLOADED",
    "SYNCED_TO_ERP",
    "PAID",
  ];

  const hasUnroutedWebhookEvent = (
    webhookEvents: any[] | undefined,
    routes: any[],
    invoiceStatus?: string,
  ): boolean => {
    if (!webhookEvents?.length || !routes.length) return false;
    if (TERMINAL_SUCCESS_STATUSES.includes((invoiceStatus || "").toUpperCase()))
      return false;
    return webhookEvents.some((evt) => {
      if (evt.deliveredAt || evt.status === "delivered") return false;
      const eventType =
        typeof evt.eventType === "object" ? evt.eventType?.id : evt.eventType;
      if (!eventType) return false;
      const hasActiveRoute = routes.some((route) => {
        const routeEventId =
          typeof route.event === "object" ? route.event?.id : route.event;
        return (
          routeEventId === eventType &&
          route.enabled !== false &&
          Array.isArray(route.actions) &&
          route.actions.length > 0
        );
      });
      return !hasActiveRoute;
    });
  };

  const formatJobErrorMessage = (
    err: { action?: string; error?: string } | null | undefined,
  ): string => {
    if (!err) return "An unexpected error occurred. Please try again.";
    const action =
      err.action && err.action !== "undefined"
        ? err.action.replace(/-/g, " ")
        : null;
    const error = err.error && err.error !== "undefined" ? err.error : null;
    if (action && error)
      return `${action.charAt(0).toUpperCase() + action.slice(1)} failed — ${error}`;
    if (error) return error;
    if (action)
      return `${action.charAt(0).toUpperCase() + action.slice(1)} failed. Please try again.`;
    return "An unexpected error occurred. Please try again.";
  };

  const renderHistoryError = (raw: string) => {
    const sepIdx = raw.indexOf(" — ");
    const prefix = sepIdx !== -1 ? raw.slice(0, sepIdx) : null;
    const rest = sepIdx !== -1 ? raw.slice(sepIdx + 3) : null;
    let parsed: any = null;
    if (rest) try { parsed = JSON.parse(rest); } catch {}

    if (!parsed) {
      return (
        <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-foreground break-words overflow-hidden">
          <span className="font-medium text-destructive">Error: </span>
          {raw}
        </div>
      );
    }

    return (
      <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs break-words overflow-hidden space-y-1.5">
        <span className="font-medium text-destructive">{prefix}</span>
        <pre className="text-foreground whitespace-pre-wrap break-all font-mono mt-1">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      </div>
    );
  };

 

  const formatStatNumber = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (n >= 100_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`;
    return n.toLocaleString();
  };

  const isFailed = (status: string) => {
    const s = status?.toLowerCase() || "";
    return s === "failed" || s === "rejected" || s === "transmission_failed";
  };

  // Show "Resend Invoice" when the invoice has any job-level error
  const hasJobError = (inv: Invoice, type: "inbound" | "outbound" = "outbound") => {
    if (type !== "outbound") return false;
    return isFailed(inv?.status) && !!inv?.lastJobError && Object.keys(inv.lastJobError).length > 0;
  };

  const handleUpdatePaymentStatus = async () => {
    if (!selectedInvoice) return;
    setUpdatingPaymentStatus(true);
    try {
      const api = createTenantApi();
      const response = await api.updatePaymentStatus(selectedInvoice.irn, {
        status: paymentStatusForm.status,
        ...(paymentStatusForm.paymentDate && {
          paymentDate: paymentStatusForm.paymentDate,
        }),
        ...(paymentStatusForm.paymentAmount && {
          paymentAmount: parseFloat(paymentStatusForm.paymentAmount),
        }),
        ...(paymentStatusForm.paymentReference && {
          paymentReference: paymentStatusForm.paymentReference,
        }),
      });
      if (response.error) {
        toast.error(
          (response.error as any)?.value?.error ||
            "Failed to update payment status",
        );
      } else {
        toast.success("Payment status updated");
        setShowPaymentStatusDialog(false);
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.irn === selectedInvoice.irn
              ? {
                  ...inv,
                  paymentStatus: paymentStatusForm.status as PaymentStatus,
                }
              : inv,
          ),
        );
        setSelectedInvoice(null);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to update payment status");
    } finally {
      setUpdatingPaymentStatus(false);
    }
  };

  const downloadQrCode = (qrCode: string, filename = "qrcode") => {
    const a = document.createElement("a");
    a.href = qrCode;
    a.download = `${filename}.png`;
    a.click();
  };

  const columns: Column<Invoice>[] = [
    {
      key: "irn",
      header: "IRN",
      sortable: true,
      accessor: (inv) => (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              inv.type === "outbound" ? "bg-primary/10" : "bg-accent/10",
            )}
          >
            {inv.type === "outbound" ? (
              <ArrowUpRight className="w-5 h-5 text-primary" />
            ) : (
              <ArrowDownLeft className="w-5 h-5 text-accent" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p
                className="font-mono font-medium text-sm truncate max-w-[120px]"
                title={inv.invoiceNumber || inv.irn}
              >
                {(inv.invoiceNumber || inv.irn).slice(0, 12)}…
              </p>
              <button
                className="text-muted-foreground hover:text-foreground shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(inv.irn);
                  toast.success("IRN copied");
                }}
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground capitalize">
              {inv.type}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Invoice Status",
      sortable: true,
      accessor: (inv) => {
        const isTerminalSuccess = TERMINAL_SUCCESS_STATUSES.includes(
          inv.status?.toUpperCase() || "",
        );
        const hasError =
          !isTerminalSuccess &&
          (hasJobError(inv) ||
            !!inv.lastJobError?.action ||
            !!inv.hasRoutingError);
        const alreadyFailed = inv.status?.toUpperCase() === "FAILED";
        const displayStatus =
          hasError && !alreadyFailed
            ? "failed"
            : inv.status?.toLowerCase() || "";
        const displayLabel =
          hasError && !alreadyFailed ? "Failed".toUpperCase() : inv.status;
        const styles: Record<string, string> = {
          // outbound
          created: "bg-muted text-muted-foreground",
          validated: "bg-success/10 text-success",
          signed: "bg-success/10 text-success",
          transmitted: "bg-success/10 text-success",
          delivered: "bg-success/10 text-success",
          failed: "bg-destructive/10 text-destructive",
          // inbound
          acknowledged: "bg-success/10 text-success",
          downloaded: "bg-success/10 text-success",
          synced_to_erp: "bg-success/10 text-success",
          paid: "bg-success/10 text-success",
          rejected: "bg-destructive/10 text-destructive",
          canceled: "bg-muted text-muted-foreground",
        };
        return (
          <Badge
            className={cn(
              "text-xs capitalize",
              styles[displayStatus] ?? "bg-muted text-muted-foreground",
            )}
          >
            {displayLabel}
          </Badge>
        );
      },
    },
    {
      key: "paymentStatus",
      header: "Payment Status",
      sortable: true,
      accessor: (inv) => {
        if (!inv.paymentStatus) {
          return <span className="text-muted-foreground text-xs">&mdash;</span>;
        }
        const s = inv.paymentStatus.toUpperCase();
        const styles: Record<string, string> = {
          PAID: "bg-success/10 text-success",
          PARTIAL: "bg-warning/10 text-warning",
          OVERDUE: "bg-destructive/10 text-destructive",
          PENDING: "bg-muted text-muted-foreground",
          REJECTED: "bg-destructive/10 text-destructive",
        };
        return (
          <Badge
            className={cn(
              "text-xs capitalize",
              styles[s] ?? "bg-muted text-muted-foreground",
            )}
          >
            {inv.paymentStatus}
          </Badge>
        );
      },
    },
    {
      key: "qrCode",
      header: "QR Code",
      className: "table-cell",
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
                      Scan with the MBS360 Application
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
      key: "erp",
      header: "ERP",
      sortable: true,
      className: "table-cell",
      accessor: (inv) => {
        if (inv.erp) {
          return (
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              {inv.erp}
            </Badge>
          );
        }
        return <span className="text-muted-foreground text-xs">&mdash;</span>;
      },
    },
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      className: "table-cell",
      accessor: (inv) => (
        <div className="text-sm">
          <p className="font-medium">
            {format(new Date(inv.createdAt), "MMM dd, yyyy")}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(inv.createdAt), "hh:mm a")}
          </p>
        </div>
      ),
    },
  ];

  const handleSort = (key: string, order: "asc" | "desc") => {
    const sorted = [...invoices].sort((a, b) => {
      let aVal: any = a[key as keyof Invoice];
      let bVal: any = b[key as keyof Invoice];

      if (key === "createdAt" || key === "issueDate" || key === "dueDate") {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal || "").toLowerCase();
      }

      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
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
      {canResend && inv.paymentStatus !== "cancelled" && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setSelectedInvoice(inv);
              setPaymentStatusForm({
                status: inv.paymentStatus || "PAID",
                paymentDate: "",
                paymentAmount: "",
                paymentReference: "",
                rejectionReason: "",
              });
              setShowPaymentStatusDialog(true);
            }}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Update Payment Status
          </DropdownMenuItem>
        </>
      )}
      {canResend &&
        inv.type === "outbound" &&
        isFailed(inv.status) &&
        (hasJobError(inv) || !!inv.lastJobError?.action) && (
          <DropdownMenuSeparator />
        )}
      {canResend && inv.type === "outbound" && isFailed(inv.status) && hasJobError(inv) && (
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
      {canResend &&
        inv.type === "outbound" &&
        isFailed(inv.status) &&
        inv.lastJobError?.action && (
          <DropdownMenuItem
            onClick={() => {
              setSelectedInvoice(inv);
              setRetryStep(inv.lastJobError!.action);
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
            <h1 className="text-2xl font-bold">Transactions</h1>
            <p className="text-muted-foreground">
              View and manage your inbound and outbound invoices
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              abortRef.current?.abort();
              setRefreshTrigger((n) => n + 1);
            }}
          >
            <RefreshCw
              className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="dark:border dark:border-grey-100">
            <CardContent className="p-4">
              <div className="flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-12 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold">{formatStatNumber(stats.total)}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-primary" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-12 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold">{formatStatNumber(stats.outbound)}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Outbound</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-12 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold">{formatStatNumber(stats.inbound)}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Inbound</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as any);
            setPage(1);
            setFilters({});
            setSearchQuery("");
          }}
        >
          <TabsList>
            <TabsTrigger value="all">All Invoices</TabsTrigger>
            <TabsTrigger value="outbound">Outbound</TabsTrigger>
            <TabsTrigger value="inbound">Inbound</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Data Table */}
        <DataTable
          key={activeTab}
          data={invoices}
          columns={columns}
          searchPlaceholder="Search by invoice number, IRN, customer..."
          filters={transactionFilters}
          rowActions={rowActions}
          onRowClick={handleViewDetails}
          isLoading={isLoading}
          currentPage={page}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          onSearch={(q) => {
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
            searchDebounceRef.current = setTimeout(() => {
              setSearchQuery(q);
              setPage(1);
            }, 400);
          }}
          onFilterChange={(f) => {
            setFilters(f);
            setPage(1);
          }}
          onSort={handleSort}
          emptyMessage="No transactions found"
        />
      </div>

      {/* Invoice Details Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.type === "outbound" ? "Outbound" : "Inbound"}{" "}
              Invoice — {selectedInvoice?.invoiceNumber || selectedInvoice?.irn}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-4 py-2">
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}
              </div>
            </div>
          ) : detailError ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Failed to load invoice details</p>
                <p className="text-xs text-muted-foreground mt-1">{detailError}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => selectedInvoice && fetchInvoiceDetails(selectedInvoice)}>
                <RefreshCw className="w-3 h-3 mr-2" />
                Retry
              </Button>
            </div>
          ) : invoiceDetails ? (
            <Tabs defaultValue="overview" className="w-full animate-fade-in">
              <TabsList className="w-full flex overflow-x-auto">
                <TabsTrigger value="overview" className="text-xs sm:text-sm">
                  Overview
                </TabsTrigger>

                <TabsTrigger value="history" className="text-xs sm:text-sm">
                  History
                </TabsTrigger>
                {selectedInvoice?.type === "outbound" && (
                  <TabsTrigger value="webhooks" className="text-xs sm:text-sm">
                    Webhooks
                  </TabsTrigger>
                )}
              </TabsList>
              <ScrollArea className="max-h-[65vh]">
                {/* ── OVERVIEW ── */}
                <TabsContent
                  value="overview"
                  className="space-y-4 mt-4 overflow-y-auto max-h-[60vh] pb-4"
                >
                  {/* Last Job Error */}
                  {hasJobError(invoiceDetails?.invoice) && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2">
                        <p className="text-sm font-medium text-destructive">
                          Last Job Error
                        </p>
                        <p className="text-xs text-foreground">
                          {formatJobErrorMessage(
                            invoiceDetails.invoice.lastJobError,
                          )}
                        </p>
                        <table className="w-full text-xs border-collapse">
                          <tbody>
                            {Object.entries(invoiceDetails.invoice.lastJobError)
                              .filter(([, v]) => v !== undefined && v !== null)
                              .map(([key, value]) => (
                                <tr
                                  key={key}
                                  className="border-t border-destructive/20"
                                >
                                  <td className="py-1 pr-3 font-medium text-muted-foreground capitalize w-1/3">
                                    {key.replace(/([A-Z])/g, " $1").trim()}
                                  </td>
                                  <td className="py-1 break-all text-foreground whitespace-pre-line">
                                    {String(value) === "undefined - undefined"
                                      ? "NRS Validation failed. Please try again."
                                      : String(value)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  {/* Workflow State Pipeline */}
                  {invoiceDetails.invoice?.workflowState && (
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <p className="text-xs font-medium text-muted-foreground mb-3">
                        Workflow Progress
                      </p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {(
                          [
                            "transformed",
                            "validated",
                            "signed",
                            "transmitted",
                            "delivered",
                          ] as const
                        ).map((step, idx, arr) => {
                          const done =
                            !!invoiceDetails.invoice.workflowState[step];
                          return (
                            <div key={step} className="flex items-center gap-1">
                              <div
                                className={cn(
                                  "flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium",
                                  done
                                    ? "bg-success/15 text-success"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                {done ? (
                                  <CheckCircle className="w-3 h-3" />
                                ) : (
                                  <Clock className="w-3 h-3" />
                                )}
                                <span className="capitalize">{step}</span>
                              </div>
                              {idx < arr.length - 1 && (
                                <div
                                  className={cn(
                                    "h-px w-4",
                                    done ? "bg-success/40" : "bg-border",
                                  )}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* QR Code */}
                  {(invoiceDetails.invoice?.qrCode ||
                    selectedInvoice?.qrCode) && (
                    <div className="flex flex-col items-center gap-2 p-4 bg-muted/50 rounded-lg border w-fit">
                      <p className="text-xs font-medium text-muted-foreground">
                        QR Code
                      </p>
                      <div className="p-2 bg-white rounded border">
                        <img
                          src={(
                            invoiceDetails.invoice?.qrCode ||
                            selectedInvoice?.qrCode ||
                            ""
                          ).toString()}
                          alt="QR Code"
                          className="w-[140px] h-[140px]"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Scan with the MBS360 Application
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          downloadQrCode(
                            (
                              invoiceDetails.invoice?.qrCode ||
                              selectedInvoice?.qrCode ||
                              ""
                            ).toString(),
                            selectedInvoice?.irn || "qrcode",
                          )
                        }
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
                      <p className="font-mono text-xs break-all">
                        {invoiceDetails.invoice?.irn || selectedInvoice?.irn}
                      </p>
                    </div>
                    {invoiceDetails.invoice?.erpInvoiceId && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          ERP Invoice ID
                        </p>
                        <p className="font-mono text-xs break-all">
                          {invoiceDetails.invoice.erpInvoiceId}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Invoice Status
                      </p>
                      <StatusBadge
                        status={(() => {
                          const raw =
                            hasUnroutedWebhookEvent(
                              invoiceDetails.webhookEvents,
                              eventRoutes,
                              invoiceDetails.invoice?.status,
                            ) &&
                            (
                              invoiceDetails.invoice?.status || ""
                            ).toUpperCase() !== "FAILED"
                              ? "FAILED"
                              : invoiceDetails.invoice?.status ||
                                selectedInvoice?.status ||
                                "";
                          return raw.toLowerCase().replace(/_/g, " ");
                        })()}
                        labelCase="uppercase"
                      />
                    </div>
                    {invoiceDetails.invoice?.paymentStatus && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Payment Status
                        </p>
                        <StatusBadge
                          status={invoiceDetails.invoice.paymentStatus.toLowerCase().replace(/_/g, " ")}
                          labelCase="uppercase"
                        />
                      </div>
                    )}
                    {invoiceDetails.invoice?.erpSystem && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          ERP System
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Package className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium capitalize">
                            {invoiceDetails.invoice.erpSystem.replace(
                              /_/g,
                              " ",
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                    {invoiceDetails.invoice?.source && (
                      <div>
                        <p className="text-xs text-muted-foreground">Source</p>
                        <p className="text-sm capitalize">
                          {invoiceDetails.invoice.source}
                        </p>
                      </div>
                    )}
                    {invoiceDetails.invoice?.validationAttempts !==
                      undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Validation Attempts
                        </p>
                        <p className="text-sm font-medium">
                          {invoiceDetails.invoice.validationAttempts}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm">
                        {format(
                          new Date(
                            invoiceDetails.invoice?.createdAt ||
                              selectedInvoice?.createdAt ||
                              Date.now(),
                          ),
                          "PPpp",
                        )}
                      </p>
                    </div>
                    {invoiceDetails.invoice?.updatedAt && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Last Updated
                        </p>
                        <p className="text-sm">
                          {format(
                            new Date(invoiceDetails.invoice.updatedAt),
                            "PPpp",
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Validation Errors */}
                  {invoiceDetails.invoice?.validationErrors?.length > 0 && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm font-medium text-destructive mb-2">
                        Validation Errors
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-foreground">
                        {invoiceDetails.invoice.validationErrors.map(
                          (err: any, idx: number) => (
                            <li key={idx}>
                              {err.message || err.error || JSON.stringify(err)}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Unrouted event warning (no lastJobError but event has no active routing) */}
                  {hasUnroutedWebhookEvent(
                    invoiceDetails.webhookEvents,
                    eventRoutes,
                    invoiceDetails.invoice?.status,
                  ) &&
                    !(
                      invoiceDetails.invoice?.lastJobError &&
                      Object.keys(invoiceDetails.invoice.lastJobError).length >
                        0
                    ) && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg space-y-1">
                        <p className="text-sm font-medium text-destructive">
                          Routing Error
                        </p>
                        <p className="text-xs text-foreground">
                          No actions are routed to this event type. The invoice
                          could not be processed. Please review your ERP sync
                          configuration and ensure the relevant event type has
                          active routing rules.
                        </p>
                      </div>
                    )}
                </TabsContent>

                {/* ── HISTORY ── */}
                <TabsContent
                  value="history"
                  className="space-y-3 mt-4 overflow-y-auto max-h-[50vh]"
                >
                  {invoiceDetails.statusHistory?.length > 0 ? (
                    <div className="relative">
                      {/* vertical timeline line */}
                      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                      <div className="space-y-4">
                        {invoiceDetails.statusHistory
                          .reverse()
                          .map((entry: any, idx: number, arr) => (
                            <div
                              key={idx}
                              className="flex items-start gap-3 pl-1 whitespace-pre-wrap break-all "
                            >
                              {/* dot */}
                              <div
                                className={cn(
                                  "w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 bg-background z-10",
                                  entry.status === "failed"
                                    ? "border-destructive"
                                    : "border-success",
                                )}
                              >
                                <div
                                  className={cn(
                                    "w-2 h-2 rounded-full",
                                    entry.status === "failed"
                                      ? "bg-destructive"
                                      : "bg-success",
                                  )}
                                />
                              </div>

                              {/* content card */}
                              <div
                                className={cn(
                                  "flex-1 p-3 border rounded-lg space-y-2 mb-1",
                                  entry.status === "failed"
                                    ? "border-destructive/30 bg-destructive/5"
                                    : "border-border bg-muted/20",
                                )}
                              >
                                {/* step + status */}
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <p className="text-sm font-semibold capitalize">
                                    {`Step ${arr.length - idx}: ${(entry.step || "status change").replace(/_/g, " ")}`}
                                  </p>
                                  <StatusBadge
                                    status={entry.status || "unknown"}
                                  />
                                </div>

                                {/* metadata grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                  {entry.at && (
                                    <div>
                                      <span className="text-muted-foreground">
                                        Time:{" "}
                                      </span>
                                      <span>
                                        {format(
                                          new Date(entry.at),
                                          "MMM dd, yyyy · hh:mm:ss a",
                                        )}
                                      </span>
                                    </div>
                                  )}
                                  {entry.eventType && (
                                    <div>
                                      <span className="text-muted-foreground">
                                        Event Type:{" "}
                                      </span>
                                      <span className="font-mono">
                                        {entry.eventType}
                                      </span>
                                    </div>
                                  )}
                                  {entry.eventId && (
                                    <div className="sm:col-span-2">
                                      <span className="text-muted-foreground">
                                        Event ID:{" "}
                                      </span>
                                      <span className="font-mono break-all">
                                        {entry.eventId}
                                      </span>
                                    </div>
                                  )}
                                  {entry.jobChainId && (
                                    <div className="sm:col-span-2">
                                      <span className="text-muted-foreground">
                                        Job Chain ID:{" "}
                                      </span>
                                      <span className="font-mono break-all">
                                        {entry.jobChainId}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* error */}
                                {entry.error && renderHistoryError(entry.error)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8 text-sm">
                      No status history available
                    </p>
                  )}
                </TabsContent>

                {/* ── WEBHOOKS ── */}
                {selectedInvoice?.type === "outbound" && (
                  <TabsContent
                    value="webhooks"
                    className="space-y-4 mt-4 overflow-y-auto max-h-[50vh]"
                  >
                    {invoiceDetails.webhookEvents?.length > 0 ? (
                      <div className="space-y-4">
                        {invoiceDetails.webhookEvents
                          .reverse()
                          .map((event: any, idx: number) => (
                            <div
                              key={idx}
                              className={cn(
                                "border rounded-lg overflow-hidden",
                                event.status === "failed"
                                  ? "border-destructive/30"
                                  : "border-border",
                              )}
                            >
                              {/* Event header */}
                              <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b flex-wrap gap-2">
                                <div className="space-y-0.5">
                                  <p className="text-sm font-medium">
                                    {event.eventType || "Webhook Event"}
                                  </p>
                                  {event.eventId && (
                                    <p className="text-xs font-mono text-muted-foreground">
                                      {event.eventId}
                                    </p>
                                  )}
                                </div>
                                <StatusBadge
                                  status={event.status || "pending"}
                                />
                              </div>

                              <div className="px-4 py-3 space-y-3">
                                {/* Timestamps */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                  {event.receivedAt && (
                                    <div>
                                      <p className="text-muted-foreground">
                                        Received
                                      </p>
                                      <p>
                                        {format(
                                          new Date(event.receivedAt),
                                          "PPpp",
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {event.deliveredAt && (
                                    <div>
                                      <p className="text-muted-foreground">
                                        Delivered
                                      </p>
                                      <p>
                                        {format(
                                          new Date(event.deliveredAt),
                                          "PPpp",
                                        )}
                                      </p>
                                    </div>
                                  )}
                                  {event.failedAt && (
                                    <div>
                                      <p className="text-muted-foreground">
                                        Failed At
                                      </p>
                                      <p className="text-destructive font-medium">
                                        {format(
                                          new Date(event.failedAt),
                                          "PPpp",
                                        )}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Failure reason */}
                                {event.failureReason && (
                                  <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs">
                                    <p className="font-medium text-destructive mb-0.5">
                                      Failure Reason
                                    </p>
                                    <p className="text-foreground whitespace-pre-wrap break-all overflow-hidden">
                                      {event.failureReason}
                                    </p>
                                  </div>
                                )}

                                {/* Routing */}
                                {event.routing?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                                      Routing
                                    </p>
                                    <div className="space-y-1">
                                      {event.routing.map(
                                        (route: any, rIdx: number) => (
                                          <div
                                            key={rIdx}
                                            className="flex items-center gap-2 flex-wrap text-xs"
                                          >
                                            <span className="font-mono text-muted-foreground">
                                              {route.routeId}
                                            </span>
                                            <span className="text-muted-foreground">
                                              →
                                            </span>
                                            {route.actions?.map(
                                              (action: string) => (
                                                <span
                                                  key={action}
                                                  className="px-1.5 py-0.5 bg-muted rounded font-mono"
                                                >
                                                  {action}
                                                </span>
                                              ),
                                            )}
                                            <StatusBadge
                                              status={
                                                route.enabled
                                                  ? "active"
                                                  : "disabled"
                                              }
                                            />
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Job errors */}
                                {event.jobErrors?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-destructive mb-1.5">
                                      Job Errors
                                    </p>
                                    <div className="space-y-2">
                                      {event.jobErrors.map(
                                        (jobErr: any, jIdx: number) => (
                                          <div
                                            key={jIdx}
                                            className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs space-y-1"
                                          >
                                            <div className="flex items-center gap-3 flex-wrap">
                                              <span className="font-medium text-foreground">
                                                Step {jobErr.step}:{" "}
                                                {jobErr.action}
                                              </span>
                                              {jobErr.failedAt && (
                                                <span className="text-muted-foreground">
                                                  {format(
                                                    new Date(jobErr.failedAt),
                                                    "PPpp",
                                                  )}
                                                </span>
                                              )}
                                            </div>
                                            <pre className="text-foreground whitespace-pre-wrap break-all overflow-hidden">
                                              {jobErr.error}
                                            </pre>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8 text-sm">
                        No webhook events available
                      </p>
                    )}
                  </TabsContent>
                )}
              </ScrollArea>
            </Tabs>
          ) : null}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {detailLoading ? (
              <>
                <Skeleton className="h-9 w-28 rounded-md" />
                <Skeleton className="h-9 w-20 rounded-md" />
              </>
            ) : (
              <>
                {canResend &&
                  selectedInvoice &&
                  isFailed(selectedInvoice.status) &&
                  hasJobError(selectedInvoice) && (
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
                {canResend &&
                  selectedInvoice?.type === "outbound" &&
                  isFailed(
                    invoiceDetails?.invoice?.status ??
                      selectedInvoice?.status ??
                      "",
                  ) &&
                  (invoiceDetails?.invoice?.lastJobError?.action ??
                    selectedInvoice?.lastJobError?.action) && (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        const action =
                          invoiceDetails?.invoice?.lastJobError?.action ??
                          selectedInvoice?.lastJobError?.action ??
                          "validate";
                        setShowDetailModal(false);
                        setRetryStep(action);
                        setShowRetryDialog(true);
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry from Step
                    </Button>
                  )}
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retry from Step Dialog */}
      <Dialog open={showRetryDialog} onOpenChange={setShowRetryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Retry from Step</DialogTitle>
            <DialogDescription>
              Resume the failed workflow for invoice{" "}
              <strong>
                {selectedInvoice?.invoiceNumber || selectedInvoice?.irn}
              </strong>{" "}
              from a specific step.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Start from step</Label>
            <Select value={retryStep} onValueChange={setRetryStep}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={selectedInvoice?.lastJobError?.action}>
                  {selectedInvoice?.lastJobError?.action?.split("-").join(" ")}
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The invoice will be reprocessed starting from the selected step,
              skipping any steps before it.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRetryDialog(false);
                setSelectedInvoice(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRetryFromStep}
              disabled={retrying}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
            >
              {retrying ? "Retrying..." : "Retry"}
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
              Are you sure you want to resend the invoice{" "}
              <strong>
                {selectedInvoice?.invoiceNumber || selectedInvoice?.irn}
              </strong>
              ? This will restart the workflow from the beginning.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedInvoice(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResend}
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              disabled={resending}
            >
              {resending ? "Resending..." : "Resend Invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Payment Status Dialog */}
      <Dialog
        open={showPaymentStatusDialog}
        onOpenChange={(open) => {
          setShowPaymentStatusDialog(open);
          if (!open) setSelectedInvoice(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Payment Status</DialogTitle>
            <DialogDescription>
              Update the payment status for invoice {selectedInvoice?.irn}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select
                value={paymentStatusForm.status}
                onValueChange={(v) =>
                  setPaymentStatusForm((f) => ({ ...f, status: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentStatusForm.paymentDate}
                onChange={(e) =>
                  setPaymentStatusForm((f) => ({
                    ...f,
                    paymentDate: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Amount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 220731.45"
                value={paymentStatusForm.paymentAmount}
                onChange={(e) =>
                  setPaymentStatusForm((f) => ({
                    ...f,
                    paymentAmount: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Reference</Label>
              <Input
                placeholder="e.g. TRF-20260406-XXXXX"
                value={paymentStatusForm.paymentReference}
                onChange={(e) =>
                  setPaymentStatusForm((f) => ({
                    ...f,
                    paymentReference: e.target.value,
                  }))
                }
              />
            </div>
            {paymentStatusForm.status.toLowerCase() === "rejected" && (
              <div
                className={cn(
                  "space-y-2 transition-opacity ease-in-out duration-300",
                  paymentStatusForm.status.toLowerCase() === "rejected"
                    ? "opacity-100"
                    : "opacity-0",
                )}
              >
                <Label>Rejection Reason</Label>
                <Input
                  placeholder="e.g. Insufficient funds"
                  value={paymentStatusForm.rejectionReason}
                  onChange={(e) =>
                    setPaymentStatusForm((f) => ({
                      ...f,
                      rejectionReason: e.target.value,
                    }))
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentStatusDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePaymentStatus}
              disabled={updatingPaymentStatus}
            >
              {updatingPaymentStatus ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
