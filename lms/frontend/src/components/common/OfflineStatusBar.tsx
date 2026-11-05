import { useState, useEffect, useCallback, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { offlineService } from '@/services/offlineService';
import { useTranslation } from '@/hooks/useTranslation';

export function OfflineStatusBar() {
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const { t } = useTranslation();

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setShowBackOnline(true);
    offlineService.syncQueue();
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowBackOnline(false), 4000);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setShowBackOnline(false);
    clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(timeoutRef.current);
    };
  }, [handleOnline, handleOffline]);

  const queueCount = offlineService.getQueue().length;

  if (showBackOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[60] bg-success text-success-foreground px-4 py-2 text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
        <Icon name="cloud_done" size={18} />
        <span className="flex-1">{t('common.backOnline')}</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[60] bg-warning text-warning-foreground px-4 py-2 text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
        <Icon name="cloud_off" size={18} />
        <span className="flex-1">{t('common.offline')}</span>
        {queueCount > 0 && (
          <span className="text-xs opacity-80">{queueCount} action{queueCount !== 1 ? 's' : ''} queued</span>
        )}
      </div>
    );
  }

  return null;
}
