import { ErrorState } from './ErrorState';
import { LoadingSkeleton } from './LoadingSkeleton';
import { EmptyState } from './EmptyState';

interface DataFetchWrapperProps<T> {
  data: T | undefined;
  isLoading: boolean;
  error?: Error | null;
  loadingType?: 'card' | 'list' | 'table' | 'detail' | 'chart' | 'profile';
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  onRetry?: () => void;
  errorTitle?: string;
  children: (data: NonNullable<T>) => React.ReactNode;
}

function categorizeError(error: any): { title: string; message: string } {
  const msg = error?.message || '';
  // Use explicit status/code from ApiError if available (set by api.ts response interceptor)
  const status = error?.status || 0;
  const code = error?.code || '';

  if (status === 0 && (msg.includes('Network Error') || msg.includes('ERR_NETWORK') || msg.includes('ERR_CONNECTION'))) {
    return { title: 'Server Unavailable', message: 'Cannot connect to the server. Check your internet connection.' };
  }
  if (msg.includes('timeout') || msg.includes('TIMEOUT') || msg.includes('ERR_TIMEOUT')) {
    return { title: 'Request Timeout', message: 'The server took too long to respond. Please try again.' };
  }
  if (msg.includes('CORS') || msg.includes('not allowed by CORS')) {
    return { title: 'Access Blocked', message: 'Request blocked by security policy. Contact support.' };
  }
  if (status === 401 || code === 'SESSION_EXPIRED' || msg.includes('Unauthorized') || msg.includes('sign in again') || msg.includes('log in again')) {
    return { title: 'Authentication Failed', message: 'Your session has expired. Please sign in again.' };
  }
  if (status === 403 || msg.includes('Forbidden')) {
    return { title: 'Access Denied', message: 'You do not have permission to access this resource.' };
  }
  if (status === 404 || msg.includes('not found') || msg.includes('Not Found')) {
    return { title: 'Not Found', message: 'The requested resource was not found.' };
  }
  if (status >= 500 || msg.includes('Internal Server Error') || msg.includes('Database')) {
    return { title: 'Server Error', message: 'The server encountered an error. Please try again later.' };
  }
  if (!msg || msg === 'An unexpected error occurred') {
    return { title: 'No Data Available', message: 'No data could be loaded at this time.' };
  }

  return { title: 'Failed to load data', message: msg || 'An unexpected error occurred' };
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
    const categorized = categorizeError(error);
    return (
      <ErrorState
        title={errorTitle || categorized.title}
        message={error.message || categorized.message}
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
