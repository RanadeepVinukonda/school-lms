import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, message, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className,
      )}
    >
      <div className="mb-5 text-on-surface-variant/40">
        {icon || <Icon name="inbox" size={64} />}
      </div>
      {title && <h3 className="text-headline-sm mb-1">{title}</h3>}
      <p className="text-body-md text-on-surface-variant max-w-sm mb-6">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
