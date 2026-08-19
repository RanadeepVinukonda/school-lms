'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'sonner';
import { ActiveAcademicYearProvider } from '@/context/ActiveAcademicYearContext';
import { setupChunkReload } from '@/lib/lazyRetry';
import { initNativeBridge } from '@/lib/native';
import SplashScreen from '@/components/common/SplashScreen';
import UploadProgressBanner from '@/components/textbook/UploadProgressBanner';
import { PWAInstallPrompt } from '@/components/common/PWAInstallPrompt';
import { OfflineStatusBar } from '@/components/common/OfflineStatusBar';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';

setupChunkReload();
initNativeBridge();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: true,
      staleTime: 30 * 1000,
      gcTime: 10 * 60 * 1000,
    },
    mutations: { retry: 1 },
  },
});

function PushNotificationManager() {
  usePushNotifications();
  return null;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);
  const language = useLanguageStore((s) => s.language);

  useEffect(() => { initialize(); }, [initialize]);
  useEffect(() => { document.documentElement.lang = language; }, [language]);

  if (isLoading) {
    return <SplashScreen isLoading onFinish={() => {}} />;
  }
  return <>{children}</>;
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <React.StrictMode>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ActiveAcademicYearProvider>
            <AuthGate>
              <SplashScreen isLoading={showSplash} onFinish={() => setShowSplash(false)} />
              <OfflineStatusBar />
              <UploadProgressBanner />
              <PWAInstallPrompt />
              <PushNotificationManager />
              <Suspense fallback={<div className="p-6">Loading...</div>}>
                <div className="container mx-auto px-4">
                  {children}
                </div>
              </Suspense>
            </AuthGate>
          </ActiveAcademicYearProvider>
          <Toaster position="top-right" richColors closeButton expand duration={4000} />
        </QueryClientProvider>
      </HelmetProvider>
    </React.StrictMode>
  );
}
