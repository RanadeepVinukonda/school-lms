/**
 * Genesis native bridge.
 *
 * Additive, opt-in mobile glue. Every import here is guarded by
 * `Capacitor.isNativePlatform()` and resolved with dynamic `import()` so the
 * regular web build (Vercel/PWA) is completely unaffected — nothing from the
 * Capacitor plugins ships to web users.
 *
 * Responsibilities (Android APK only):
 *  - Hide the native splash as soon as the app is interactive.
 *  - Keep the status-bar icon colour in sync with the app's dark/light theme.
 *  - Android back button: SPA-aware (browser history first, then minimize).
 *  - Deep links (`https://…` and `com.school.lms://…`): route inside the SPA.
 *  - Network status: surface a minimal offline banner + retry.
 *  - Helpers: native share, clipboard write, external URL opening.
 */

import { consumeBackPress } from './backHandler';

let routerModule: Promise<{ router: typeof import('@/app/router').router }> | null = null;
function getRouter(): Promise<{ router: typeof import('@/app/router').router }> {
  if (!routerModule) {
    routerModule = import('@/app/router');
  }
  return routerModule;
}

async function isNativeAsync(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function pathFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return url;
  }
}

async function syncStatusBar(dark: boolean) {
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: dark ? Style.Light : Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#00000000' });
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    /* plugin unavailable */
  }
}

let statusBarObserver: MutationObserver | null = null;
function watchTheme() {
  if (statusBarObserver || typeof MutationObserver === 'undefined') return;
  const root = document.documentElement;
  statusBarObserver = new MutationObserver(() => {
    syncStatusBar(root.classList.contains('dark'));
  });
  statusBarObserver.observe(root, { attributes: true, attributeFilter: ['class'] });
  syncStatusBar(root.classList.contains('dark'));
}

function applyOfflineBanner(offline: boolean) {
  const existing = document.getElementById('genesis-offline-banner');
  if (!offline) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const banner = document.createElement('div');
  banner.id = 'genesis-offline-banner';
  banner.setAttribute('role', 'status');
  banner.style.cssText = [
    'position:fixed',
    'left:0',
    'right:0',
    'top:max(env(safe-area-inset-top),0px)',
    'z-index:2147483646',
    'display:flex',
    'align-items:center',
    'justify-content:space-between',
    'gap:8px',
    'padding:10px 14px',
    'background:hsl(var(--error-container))',
    'color:hsl(var(--on-error-container))',
    'font-size:13px',
    'font-weight:600',
    'box-shadow:var(--elevation-2)',
  ].join(';');
  const label = document.createElement('span');
  label.textContent = 'You are offline — check your connection.';
  const retry = document.createElement('button');
  retry.textContent = 'Retry';
  retry.type = 'button';
  retry.style.cssText = [
    'border:none',
    'border-radius:6px',
    'padding:6px 12px',
    'font-weight:700',
    'font-size:12px',
    'cursor:pointer',
    'background:hsl(var(--primary))',
    'color:hsl(var(--on-primary))',
  ].join(';');
  retry.onclick = () => window.location.reload();
  banner.appendChild(label);
  banner.appendChild(retry);
  document.body.appendChild(banner);
}

async function watchNetwork() {
  try {
    const { Network } = await import('@capacitor/network');
    const status = await Network.getStatus();
    applyOfflineBanner(!status.connected);
    await Network.addListener('networkStatusChange', (s: { connected: boolean }) => {
      applyOfflineBanner(!s.connected);
      window.dispatchEvent(new Event(s.connected ? 'online' : 'offline'));
    });
  } catch {
    const on = () => applyOfflineBanner(!navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
  }
}

function watchDeepLinks() {
  import('@capacitor/app').then(({ App }) => {
    App.addListener('appUrlOpen', async (event: { url: string }) => {
      const path = pathFromUrl(event.url);
      if (!path || path === '/') return;
      const { router } = await getRouter();
      router.navigate(path);
    });
  }).catch(() => {});
}

function watchBackButton() {
  import('@capacitor/app').then(({ App }) => {
    App.addListener('backButton', (event: { canGoBack: boolean }) => {
      if (consumeBackPress()) {
        return;
      }
      if (event.canGoBack) {
        window.history.back();
      } else {
        App.minimizeApp();
      }
    });
  }).catch(() => {});
}

/** Call once from the app bootstrap (no-op on web). */
export async function initNativeBridge(): Promise<void> {
  if (!(await isNativeAsync())) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    /* splash already hidden */
  }
  watchTheme();
  watchNetwork();
  watchDeepLinks();
  watchBackButton();
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.getPlatform() === 'android') {
    document.documentElement.classList.add('genesis-native');
  }
}

/** Native share sheet (falls back to the Web Share API, then no-op). */
export async function nativeShare(payload: { title?: string; text?: string; url?: string }): Promise<void> {
  if (!(await isNativeAsync())) {
    if (navigator.share) {
      await navigator.share(payload as ShareData);
    }
    return;
  }
  try {
    const { Share } = await import('@capacitor/share');
    await Share.share({ title: payload.title, text: payload.text, url: payload.url });
  } catch {
    /* user dismissed or share unavailable */
  }
}

/** Copy text to the clipboard (native plugin on Android, Web Clipboard API elsewhere). */
export async function nativeCopy(text: string): Promise<boolean> {
  if (!(await isNativeAsync())) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  try {
    const { Clipboard } = await import('@capacitor/clipboard');
    await Clipboard.write({ string: text });
    return true;
  } catch {
    return false;
  }
}

/** Open a URL in an in-app browser on native; new tab on web. */
export async function openExternal(url: string): Promise<void> {
  if (!(await isNativeAsync())) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
