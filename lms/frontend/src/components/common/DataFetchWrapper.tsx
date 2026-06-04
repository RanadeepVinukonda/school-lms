import { ErrorState } from './ErrorState';
import { LoadingSkeleton } from './LoadingSkeleton';
import { EmptyState } from './EmptyState';

interface DataFetchWrapperProps<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  loadingType?: 'card' | 'list' | 'table' | 'detail' | 'chart' | 'profile';
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  onRetry?: () => void;
  errorTitle?: string;
  children: (data: NonNullable<T>) => React.ReactNode;
}

export function DataFetchWrapper<T>({
  data,
  isLoading,
  error,
  loadingType = 'card',
  emptyMessage,
  emptyIcon,
  emptyAction,
  onRetry,
  errorTitle,
  children,
}: DataFetchWrapperProps<T>) {
  if (isLoading) {
    return <LoadingSkeleton type={loadingType} />;
  }

  if (error) {
    return (
      <ErrorState
        title={errorTitle || 'Failed to load data'}
        message={error.message || 'An unexpected error occurred'}
        onRetry={onRetry}
      />
    );
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <EmptyState
        message={emptyMessage || 'No data available'}
        icon={emptyIcon}
        action={emptyAction}
      />
    );
  }

  return <>{children(data)}</>;
}
