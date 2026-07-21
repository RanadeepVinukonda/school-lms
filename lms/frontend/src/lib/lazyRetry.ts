import { lazy } from 'react';

export function lazyRetry<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 2,
  delay = 1500,
) {
  return lazy(async () => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await importFn();
      } catch {
        if (i < retries) {
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    window.location.reload();
    return new Promise<{ default: T }>(() => {});
  });
}

export function setupChunkReload() {
  const handler = (event: PromiseRejectionEvent) => {
    const msg = event.reason?.message || '';
    if (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('ChunkLoadError') ||
      msg.includes('dynamically imported')
    ) {
      event.preventDefault();
      window.location.reload();
    }
  };
  window.addEventListener('unhandledrejection', handler);
  return () => window.removeEventListener('unhandledrejection', handler);
}
