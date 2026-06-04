import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  details?: string;
}

export function ErrorState({ title, message, onRetry, className, details }: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className,
      )}
    >
      <div className="mb-5 rounded-full bg-error-container p-4">
        <Icon name="error_outline" size={32} className="text-on-error-container" />
      </div>
      <h3 className="text-headline-sm mb-1">{title || 'Something went wrong'}</h3>
      <p className="text-body-md text-on-surface-variant max-w-sm mb-2">{message}</p>
      {details && (
        <p className="text-body-sm text-on-surface-variant/70 max-w-sm mb-4 font-mono bg-surface-variant/50 p-3 rounded-lg">{details}</p>
      )}
      {onRetry && (
        <Button variant="tonal" onClick={onRetry} className="gap-2">
          <Icon name="refresh" size={18} />
          Try again
        </Button>
      )}
    </div>
  );
}
