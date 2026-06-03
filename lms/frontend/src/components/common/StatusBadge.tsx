import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'> = {
  active: 'success',
  published: 'success',
  completed: 'success',
  graded: 'success',
  passed: 'success',
  submitted: 'info',
  in_progress: 'info',
  pending: 'warning',
  draft: 'secondary',
  paused: 'warning',
  archived: 'outline',
  closed: 'destructive',
  failed: 'destructive',
  dropped: 'destructive',
  late: 'warning',
  disabled: 'outline',
  inactive: 'secondary',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = statusVariantMap[status.toLowerCase()] || 'default';
  return (
    <Badge variant={variant} className={cn('capitalize', className)}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}
