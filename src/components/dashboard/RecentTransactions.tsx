import { formatDistanceToNow } from 'date-fns';
import { FileText, ArrowUpRight, ArrowDownLeft, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/lib/mockData';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
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
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      submitted: 'status-badge status-active',
      validated: 'bg-info/10 text-info',
      pending: 'status-badge status-pending',
      failed: 'status-badge status-error',
      cancelled: 'status-badge status-inactive',
    };
    return styles[status] || 'status-badge status-inactive';
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
          <a href="/transactions" className="text-sm text-primary hover:underline">
            View all →
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.slice(0, 5).map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  transaction.type === 'outbound' ? 'bg-primary/10' : 'bg-accent/10'
                )}
              >
                {transaction.type === 'outbound' ? (
                  <ArrowUpRight className="w-5 h-5 text-primary" />
                ) : (
                  <ArrowDownLeft className="w-5 h-5 text-accent" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{transaction.invoiceNumber}</p>
                  {getStatusIcon(transaction.status)}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {transaction.customerName}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {formatAmount(transaction.amount, transaction.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                </p>
              </div>
              <Badge className={getStatusBadge(transaction.status)}>
                {transaction.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
