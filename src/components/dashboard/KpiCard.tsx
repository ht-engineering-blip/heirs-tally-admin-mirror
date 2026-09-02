import { ReactNode } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
  isLoading?: boolean;
}

function formatStatNumber(n: string | number): string {
  if (typeof n !== 'number') return String(n);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 100_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}k`;
  return n.toLocaleString();
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  variant = 'default',
  isLoading = false,
}: KpiCardProps) {
  const variantStyles = {
    default: 'bg-card',
    primary: 'gradient-primary text-primary-foreground',
    success: 'gradient-success text-success-foreground',
    warning: 'bg-warning/10',
  };

  const iconBgStyles = {
    default: 'bg-primary/10 text-primary',
    primary: 'bg-primary-foreground/20 text-primary-foreground',
    success: 'bg-success-foreground/20 text-success-foreground',
    warning: 'bg-warning/20 text-warning',
  };

  return (
    <div
      className={cn(
        'kpi-card',
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <p
            className={cn(
              'kpi-label',
              variant !== 'default' && variant !== 'warning' && 'text-inherit opacity-80'
            )}
          >
            {title}
          </p>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p
              className={cn(
                'kpi-value',
                variant !== 'default' && variant !== 'warning' && 'text-inherit'
              )}
            >
              {formatStatNumber(value)}
            </p>
          )}
          {trend && !isLoading && (
            <div
              className={cn(
                'flex items-center gap-1 text-sm font-medium',
                trend.isPositive ? 'text-success' : 'text-destructive',
                variant !== 'default' && variant !== 'warning' && 'text-inherit opacity-90'
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
            </div>
          )}
          {isLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            subtitle && (
              <p
                className={cn(
                  'text-sm text-muted-foreground',
                  variant !== 'default' && variant !== 'warning' && 'text-inherit opacity-70'
                )}
              >
                {subtitle}
              </p>
            )
          )}
        </div>
        <div
          className={cn(
            'w-10 h-10 xl:w-12 xl:h-12 rounded-xl flex items-center justify-center shrink-0',
            iconBgStyles[variant]
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
