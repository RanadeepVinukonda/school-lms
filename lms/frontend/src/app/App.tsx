import { useEffect, useState, useRef } from 'react';
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
import { getPrimaryRole } from '@/lib/roleHelpers';
import { ROUTES } from '@/lib/constants';

import { ClassScopeProvider } from '@/contexts/ClassScopeContext';

function roleDashboard(userRole: string): string {
  const primaryRole = getPrimaryRole(userRole);
  switch (primaryRole) {
    case 'admin':
    case 'super_admin':
      return ROUTES.ADMIN_DASHBOARD;
    case 'teacher':
      return ROUTES.TEACHER_DASHBOARD;
    case 'parent':
      return ROUTES.PARENT_DASHBOARD;
    case 'student':
    default:
      return ROUTES.STUDENT_DASHBOARD;
  }
}

function PushNotificationManager() {
  usePushNotifications();
  return null;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const language = useLanguageStore((s) => s.language);
  const redirected = useRef(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // After init, if user has a persisted session, skip login/welcome and go to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !redirected.current) {
      const path = window.location.pathname;
      if (path === ROUTES.LOGIN || path === ROUTES.WELCOME || path === '/') {
        redirected.current = true;
        router.navigate(roleDashboard(user.role), { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, user]);

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
