import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';

export function RouteErrorFallback() {
  const error = useRouteError();
  let title = 'Unexpected Error';
  let message = 'Something went wrong while loading this page.';

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = error.data?.message || message;
  } else if (error instanceof Error) {
    title = 'Application Error';
    message = error.message || message;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
      <div className="mb-5 rounded-full bg-error-container p-4">
        <Icon name="error_outline" size={32} className="text-on-error-container" />
      </div>
      <h2 className="text-headline-sm mb-2">{title}</h2>
      <p className="text-body-md text-on-surface-variant max-w-md mb-6">{message}</p>
      <div className="flex gap-3">
        <Button variant="tonal" onClick={() => window.location.reload()} className="gap-2">
          <Icon name="refresh" size={18} />
          Reload Page
        </Button>
        <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
          <Icon name="arrow_back" size={18} />
          Go Back
        </Button>
      </div>
    </div>
  );
}
