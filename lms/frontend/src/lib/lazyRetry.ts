import { lazy } from 'react';

const CHUNK_ERROR_MESSAGES = [
  'Failed to fetch dynamically imported module',
  'Loading chunk',
  'ChunkLoadError',
  'dynamically imported',
  'import(',
];

export function isChunkError(error: unknown): boolean {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : (error as Error)?.message || '';
  return CHUNK_ERROR_MESSAGES.some((m) => msg.includes(m));
}

const SESSION_KEY = 'opencode-chunk-retry';

export function lazyRetry<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 2,
  delay = 1500,
) {
  return lazy(async () => {
    for (let i = 0; i <= retries; i++) {
      try {
        const mod = await importFn();
        sessionStorage.removeItem(SESSION_KEY);
        return mod;
      } catch {
        if (i < retries) {
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    if (!sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, '1');
      window.location.reload();
    }

    return new Promise<{ default: T }>(() => {});
  });
}

export function setupChunkReload() {
  const reloadIfChunkError = (source: string, msg: string) => {
    if (isChunkError(msg) && !sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, '1');
      window.location.reload();
    }
  };

  const errorHandler = (event: ErrorEvent) => {
    reloadIfChunkError('error', event.message);
  };

  const rejectionHandler = (event: PromiseRejectionEvent) => {
    reloadIfChunkError('unhandledrejection', event.reason?.message || '');
  };

  window.addEventListener('error', errorHandler);
  window.addEventListener('unhandledrejection', rejectionHandler);

  return () => {
    window.removeEventListener('error', errorHandler);
    window.removeEventListener('unhandledrejection', rejectionHandler);
  };
}
