import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(!!(isSafari || ios));

    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as Record<string, unknown>).standalone === true);
    setIsStandalone(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  if (isStandalone || dismissed) return null;

  if (isIOS) {
    return (
      <div className="fixed bottom-24 left-4 right-4 z-50 max-w-sm mx-auto rounded-xl border border-outline-variant bg-surface p-4 shadow-elevation-3 animate-in slide-in-from-bottom-4">
        <div className="flex items-start gap-3">
          <Icon name="install_mobile" size={24} className="text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Install App</p>
            <p className="text-xs text-on-surface-variant mt-1">
              Tap the Share button <Icon name="ios_share" size={14} className="inline" /> and select &quot;Add to Home Screen&quot; to install.
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={handleDismiss}>
            <Icon name="close" size={18} />
          </Button>
        </div>
      </div>
    );
  }

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 max-w-sm mx-auto rounded-xl border border-outline-variant bg-surface p-4 shadow-elevation-3 animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <Icon name="install_mobile" size={24} className="text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Install Genesis LMS</p>
          <p className="text-xs text-on-surface-variant mt-1">Install the app for a better experience with offline access.</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={handleDismiss}>
          <Icon name="close" size={18} />
        </Button>
      </div>
      <div className="flex gap-2 mt-3">
        <Button variant="default" size="sm" className="flex-1" onClick={handleInstall}>
          <Icon name="download" size={16} className="mr-1" />
          Install
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDismiss}>
          Not now
        </Button>
      </div>
    </div>
  );
}
