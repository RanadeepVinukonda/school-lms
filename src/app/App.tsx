import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { router } from '@/app/router';
import SplashScreen from '@/components/common/SplashScreen';
import UploadProgressBanner from '@/components/textbook/UploadProgressBanner';
import { PWAInstallPrompt } from '@/components/common/PWAInstallPrompt';
import { OfflineStatusBar } from '@/components/common/OfflineStatusBar';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';

import { ClassScopeProvider } from '@/contexts/ClassScopeContext';

function PushNotificationManager() {
  usePushNotifications();
  return null;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  if (isLoading) {
    return <SplashScreen isLoading onFinish={() => {}} />;
  }

  return <>{children}</>;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AuthGate>
      <MotionConfig reducedMotion="always" transition={{ duration: 0 }}>
        <ClassScopeProvider>
          <SplashScreen isLoading={showSplash} onFinish={() => setShowSplash(false)} />
          <OfflineStatusBar />
          <UploadProgressBanner />
          <PWAInstallPrompt />
          <PushNotificationManager />
          <div className="container mx-auto px-4">
            <RouterProvider router={router} />
          </div>
        </ClassScopeProvider>
      </MotionConfig>
    </AuthGate>
  );
}
