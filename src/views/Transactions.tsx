'use client'

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Eye,
  RefreshCw,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { DataTable, Column, FilterOption, StatusBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import type { Transaction } from '@/lib/mockData';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const transactionFilters: FilterOption[] = [
  {
    key: 'status',
    label: 'Status',
    options: [
      { value: 'submitted', label: 'Submitted' },
      { value: 'validated', label: 'Validated' },
      { value: 'pending', label: 'Pending' },
      { value: 'failed', label: 'Failed' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
  },
  {
    key: 'type',
    label: 'Type',
    options: [
      { value: 'outbound', label: 'Outbound' },
      { value: 'inbound', label: 'Inbound' },
    ],
  },
];

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await api.transactions.getAll({
        page,
        pageSize: 10,
        search: searchQuery,
        ...filters,
      });
      setTransactions(response.data);
      setAllTransactions(response.data);
      setTotal(response.pagination?.total || response.data.length);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, searchQuery, filters]);

  const handleRetry = async (transaction: Transaction) => {
    try {
      await api.transactions.retry(transaction.id);
      toast.success('Transaction queued for retry');
      fetchTransactions();
    } catch (error) {
      toast.error('Failed to retry transaction');
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'validated':
        return <CheckCircle className="w-4 h-4 text-info" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const columns: Column<Transaction>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      sortable: true,
      accessor: (txn) => (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              txn.type === 'outbound' ? 'bg-primary/10' : 'bg-accent/10'
            )}
          >
            {txn.type === 'outbound' ? (
              <ArrowUpRight className="w-5 h-5 text-primary" />
            ) : (
              <ArrowDownLeft className="w-5 h-5 text-accent" />
            )}
          </div>
          <div>
            <p className="font-mono font-medium">{txn.invoiceNumber}</p>
            <p className="text-sm text-muted-foreground capitalize">{txn.type}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'tenantName',
      header: 'Tenant',
      accessor: (txn) => (
        <span className="text-sm">{txn.tenantName}</span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      accessor: (txn) => (
        <span className="text-sm">{txn.customerName}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      accessor: (txn) => (
        <span className="font-semibold">{formatAmount(txn.amount, txn.currency)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (txn) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(txn.status)}
          <StatusBadge status={txn.status} />
        </div>
      ),
    },
    {
      key: 'firsUuid',
      header: 'NRS UUID',
      accessor: (txn) => (
        txn.firsUuid ? (
          <span className="font-mono text-xs text-muted-foreground">{txn.firsUuid}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      accessor: (txn) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(txn.createdAt), { addSuffix: true })}
        </span>
      ),
    },
  ];

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    const sorted = [...transactions].sort((a, b) => {
      let aVal: any = a[key as keyof Transaction];
      let bVal: any = b[key as keyof Transaction];
      
      if (key === 'createdAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (key === 'amount') {
        aVal = Number(aVal);
        bVal = Number(bVal);
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
    setTransactions(sorted);
  };

  const rowActions = (txn: Transaction) => (
    <>
      <DropdownMenuItem>
        <Eye className="w-4 h-4 mr-2" />
        View Details
      </DropdownMenuItem>
      {txn.status === 'failed' && (
        <DropdownMenuItem onClick={() => handleRetry(txn)}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </DropdownMenuItem>
      )}
      <DropdownMenuItem>
        <Download className="w-4 h-4 mr-2" />
        Download
      </DropdownMenuItem>
    </>
  );

  // Stats calculation
  const stats = {
    total: 10,
    submitted: transactions.filter(t => t.status === 'submitted').length,
    validated: transactions.filter(t => t.status === 'validated').length,
    pending: transactions.filter(t => t.status === 'pending').length,
    failed: transactions.filter(t => t.status === 'failed').length,
  };

  return ( 
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Transaction Logs</h1>
            <p className="page-subtitle">View and manage all invoice transactions</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="kpi-card">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
          <div className="kpi-card">
            <p className="text-2xl font-bold text-success">{stats.submitted}</p>
            <p className="text-sm text-muted-foreground">Submitted</p>
          </div>
          <div className="kpi-card">
            <p className="text-2xl font-bold text-info">{stats.validated}</p>
            <p className="text-sm text-muted-foreground">Validated</p>
          </div>
          <div className="kpi-card">
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </div>
          <div className="kpi-card">
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
            <p className="text-sm text-muted-foreground">Failed</p>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          data={transactions}
          columns={columns}
          searchPlaceholder="Search by invoice number, tenant, or customer..."
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
  );
}
