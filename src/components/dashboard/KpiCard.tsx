import { ReactNode } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  variant = 'default',
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
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p
            className={cn(
              'kpi-label',
              variant !== 'default' && variant !== 'warning' && 'text-inherit opacity-80'
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              'kpi-value',
              variant !== 'default' && variant !== 'warning' && 'text-inherit'
            )}
          >
            {value}
          </p>
          {trend && (
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
          {subtitle && (
            <p
              className={cn(
                'text-sm text-muted-foreground',
                variant !== 'default' && variant !== 'warning' && 'text-inherit opacity-70'
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            iconBgStyles[variant]
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
