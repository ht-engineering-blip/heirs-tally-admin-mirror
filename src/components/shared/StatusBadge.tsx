import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'outline';
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'status-active' },
  onboarding: { label: 'Onboarding', className: 'status-onboarding' },
  pending: { label: 'Pending', className: 'status-pending' },
  suspended: { label: 'Suspended', className: 'status-error' },
  inactive: { label: 'Inactive', className: 'status-inactive' },
  submitted: { label: 'Submitted', className: 'status-active' },
  validated: { label: 'Validated', className: 'bg-info/10 text-info' },
  invited: { label: 'Invited', className: 'bg-info/10 text-info' },
  failed: { label: 'Failed', className: 'status-error' },
  cancelled: { label: 'Cancelled', className: 'status-inactive' },
  locked: { label: 'Locked', className: 'status-error' },
  revoked: { label: 'Revoked', className: 'status-error' },
  expired: { label: 'Expired', className: 'status-inactive' },
};

export function StatusBadge({ status, variant = 'default' }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'status-inactive' };

  return (
    <span className={cn('status-badge capitalize', config.className)}>
      {config.label}
    </span>
  );
}
