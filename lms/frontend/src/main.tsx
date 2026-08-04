import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ActiveAcademicYearProvider } from '@/context/ActiveAcademicYearContext';
import { setupChunkReload } from '@/lib/lazyRetry';
import { initNativeBridge } from '@/lib/native';
import App from './app/App';
import './index.css';
import './lib/motion.css';
import 'katex/dist/katex.min.css';

setupChunkReload();
initNativeBridge();

window.addEventListener('error', (event) => {
  console.error('[Global] Uncaught error:', event.error || event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global] Unhandled rejection:', event.reason);
});

// ── PWA / Service Worker ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(
      (registration) => {
        console.log('[SW] ServiceWorker registered:', registration.scope);
      },
      (err) => {
        console.warn('[SW] ServiceWorker registration failed:', err);
      },
    );
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: true,
      staleTime: 30 * 1000,
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ActiveAcademicYearProvider>
          <ErrorBoundary><App /></ErrorBoundary>
        </ActiveAcademicYearProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          expand
          duration={4000}
        />
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
