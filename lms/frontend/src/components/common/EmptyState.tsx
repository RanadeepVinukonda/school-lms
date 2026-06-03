import { Inbox } from 'lucide-react';
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
      <div className="mb-4 text-muted-foreground/50">
        {icon || <Inbox className="h-16 w-16" />}
      </div>
      {title && <h3 className="text-lg font-semibold mb-1">{title}</h3>}
      <p className="text-muted-foreground max-w-sm mb-6">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
