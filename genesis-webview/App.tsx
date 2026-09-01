import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, StatusBar, TouchableOpacity, NativeModules } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

// A build tag in the URL guarantees the WebView always fetches the current
// live bundle. Next.js gives every deploy new hashed chunk filenames, but the
// HTML shell and index can be served from the Android WebView's HTTP cache for
// ages, which is why a stale (pre-badge-fix) build kept running inside the app
// even after Vercel deployed the fix. Bumping this tag per APK release forces a
// full re-fetch, and cacheMode=LOAD_NO_CACHE below makes the WebView never read
// an HTTP-cached copy at all. Bump this whenever you ship a new APK.
const BUILD_TAG = '20260904-2';
const WEBSITE_URL = `https://genesis-frontend-teal.vercel.app/?v=${BUILD_TAG}`;

// The web app registers a service worker (see service-worker.js) that serves
// JS chunks CACHE-FIRST. Once a stale (pre-fix) chunk is in the SW cache it is
// served forever, silently ignoring every Vercel deploy AND the LOAD_NO_CACHE
// flag above (the SW intercepts fetches inside the page). To bust that stale
// SW cache on the app side we clear caches + unregister all service workers and
// reload once, so the next load re-fetches the current fixed bundle from the
// network and re-caches the good chunks.
const SW_CACHE_CLEAR_JS = `
(function () {
  if (window.__genesisSwCleared) return;
  var flag = false;
  try { flag = localStorage.getItem('__genesisSwCleared') === '1'; } catch (e) {}
  var done = function () {
    var reload = false;
    try {
      if (localStorage.getItem('__genesisSwCleared') !== '1') {
        localStorage.setItem('__genesisSwCleared', '1');
        reload = true;
      }
    } catch (e) { reload = false; }
    window.__genesisSwCleared = true;
    if (reload) { location.reload(); }
  };
  if (flag) return;
  try {
    if ('caches' in window) {
      caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      }).then(function () {
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
          return navigator.serviceWorker.getRegistrations().then(function (regs) {
            return Promise.all(regs.map(function (r) { return r.unregister(); }));
          });
        }
      }).then(done).catch(done);
    } else {
      done();
    }
  } catch (e) { done(); }
})();
true;
`;

// Capacitor-compatible bridge injected into the WebView so the web app's
// native file-export path (`@capacitor/core` -> `registerPlugin('FileShare')`)
// is satisfied by a real Android module that opens the system "Open With"
// chooser. Everything survives the web app re-installing its own Capacitor
// globals because we re-assert the native flags + nativePromise on an interval
// and the Capacitor factory preserves pre-existing properties (PluginHeaders,
// nativePromise) instead of clearing them.
const OPEN_WITH_SHIM = `
(function () {
  if (window.__genesisOpenWithInstalled) return;
  window.__genesisOpenWithInstalled = true;
  function ensure() {
    var C = window.Capacitor = window.Capacitor || {};
    C.isNativePlatform = function () { return true; };
    C.getPlatform = function () { return 'android'; };
    C.getConfig = C.getConfig || function () { return {}; };
    C.PluginHeaders = C.PluginHeaders || [];
    if (!C.PluginHeaders.some(function (h) { return h.name === 'FileShare'; })) {
      C.PluginHeaders.push({
        name: 'FileShare',
        methods: [{ name: 'open', rtype: 'promise' }]
      });
    }
    if (!C.nativePromise) {
      C.nativePromise = function (pluginName, methodName, options) {
        return new Promise(function (resolve, reject) {
          var pending = window.__genesisFsPending = window.__genesisFsPending || {};
          var id = (window.__genesisFsSeq = (window.__genesisFsSeq || 0) + 1);
          pending[id] = { resolve: resolve, reject: reject };
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'genesisNativeCall', callId: id, plugin: pluginName,
            method: methodName, options: options || {}
          }));
          // Watchdog: never leave a bridged call pending forever. If the
          // native side has not answered within 25s the call fails loudly
          // instead of silently buffering (spinner that never stops).
          window.setTimeout(function () {
            var p = pending[id];
            if (p) {
              delete pending[id];
              p.reject(new Error('Native bridge timed out (' + pluginName + '.' + methodName + ')'));
            }
          }, 25000);
        });
      };
    }
    C.nativeCallback = C.nativeCallback || function () { return 0; };
  }
  ensure();
  setInterval(ensure, 1000);
  window.addEventListener('load', ensure);
})();
true;
`;

const ERROR_CAPTURE_JS = `
(function() {
  var originalOnError = window.onerror;
  window.onerror = function(msg, url, line, col, error) {
    var errMsg = (error && error.stack) ? error.stack : msg + ' at ' + url + ':' + line;
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'jsError', message: errMsg }));
    } catch(e) {}
    if (originalOnError) return originalOnError(msg, url, line, col, error);
    return false;
  };

  window.addEventListener('unhandledrejection', function(e) {
    var errMsg = e.reason && e.reason.stack ? e.reason.stack : String(e.reason);
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'jsError', message: errMsg }));
    } catch(ex) {}
  });

  var origConsole = console.error;
  console.error = function() {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'consoleError', message: Array.prototype.map.call(arguments, String).join(' ') }));
    } catch(e) {}
    return origConsole.apply(console, arguments);
  };
})();
true;
`;

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const injectedJs = useMemo(() => ERROR_CAPTURE_JS, []);
  // Post-load JS: bust the stale service-worker cache first (so fixed chunks
  // are fetched on the reload), then re-assert the Open-With Capacitor bridge.
  const postLoadJs = useMemo(() => SW_CACHE_CLEAR_JS + '\n' + OPEN_WITH_SHIM, []);

  const onLoadEnd = useCallback(() => {
    setLoading(false);
    SplashScreen.hideAsync();
  }, []);

  const onError = useCallback(() => {
    setLoading(false);
    SplashScreen.hideAsync();
  }, []);

  // Settle (resolve/reject) a bridged FileShare call inside the WebView so the
  // web app's pending promise ALWAYS completes — it can never hang/spin.
  const settleFs = useCallback((callId: number, kind: 'resolve' | 'reject', value: string) => {
    const script = kind === 'resolve'
      ? `(function(){var p=(window.__genesisFsPending||{})[${JSON.stringify(callId)}]; if(p){delete window.__genesisFsPending[${JSON.stringify(callId)}]; p.resolve(${value});}})(); true;`
      : `(function(){var p=(window.__genesisFsPending||{})[${JSON.stringify(callId)}]; if(p){delete window.__genesisFsPending[${JSON.stringify(callId)}]; p.reject(new Error(${JSON.stringify(value)}));}})(); true;`;
    try {
      webViewRef.current?.injectJavaScript(script);
    } catch {}
  }, []);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    let data: any;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (data.type === 'jsError') {
      setError(data.message);
      return;
    }
    if (data.type !== 'genesisNativeCall') return;

    const callId = data.callId;
    const rejectFs = (msg: string) => settleFs(callId, 'reject', msg);

    // Any bridged call we cannot fully service must reject its pending promise
    // immediately. A swallowed call leaves the web app's button "buffering"
    // forever with no file and no error, which is exactly what was reported.
    if (data.plugin !== 'FileShare' || data.method !== 'open') {
      rejectFs('Unsupported native call: ' + data.plugin + '.' + data.method);
      return;
    }
    const opts = (data.options || {}) as Record<string, string>;
    try {
      const mod = (NativeModules as any).GenesisOpenWith;
      if (!mod || typeof mod.openFile !== 'function') {
        console.error('[genesis] NativeModules.GenesisOpenWith is missing in this build');
        rejectFs('FileShare module is not available in this app build');
        return;
      }
      mod.openFile(
        String(opts.filename || 'file'),
        String(opts.mimeType || 'application/pdf'),
        String(opts.content || ''),
        (result: any) => settleFs(callId, 'resolve', JSON.stringify(result || { status: 'shared' })),
        (error: any) => rejectFs(String((error && error.message) || error)),
      );
    } catch (err: any) {
      console.error('[genesis] FileShare call threw:', String((err && err.message) || err));
      rejectFs('FileShare call failed: ' + String((err && err.message) || err));
    }
  }, [settleFs]);

  const dismissError = useCallback(() => setError(null), []);

  // Auto-dismiss the error banner after 6s so it never blocks the UI.
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(dismissError, 6000);
    return () => clearTimeout(timer);
  }, [error, dismissError]);

  // Grant common Android webview permissions (camera/mic/geolocation) so
  // camera-capture features inside the web app keep working on device.
  const onPermissionRequest = useCallback((event: any) => {
    try {
      event?.nativeEvent?.request?.('grant');
    } catch {}
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2B3D5E" />
          </View>
        )}
        {error && (
          <View style={styles.errorBanner}>
            <View style={styles.errorBannerContent}>
              <Text style={styles.errorText} numberOfLines={3}>{error}</Text>
              <TouchableOpacity onPress={dismissError} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.errorDismiss}>
                <Text style={styles.errorDismissText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: WEBSITE_URL }}
          style={styles.webview}
          onLoadEnd={onLoadEnd}
          onError={onError}
          onMessage={onMessage}
          onPermissionRequest={onPermissionRequest}
          injectedJavaScriptBeforeContentLoaded={injectedJs}
          injectedJavaScript={postLoadJs}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          allowsBackForwardNavigationGestures
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          allowFileAccess
          cacheEnabled={false}
          cacheMode="LOAD_NO_CACHE"
          setSupportMultipleWindows={false}
          allowUniversalAccessFromFileURLs
          mixedContentMode="compatibility"
          setBuiltInZoomControls={false}
          setDisplayZoomControls={false}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF5' },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FAFAF5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  errorBanner: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFEBEE', padding: 8, zIndex: 20,
  },
  errorBannerContent: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  errorDismiss: {
    paddingHorizontal: 4, paddingVertical: 2,
  },
  errorDismissText: {
    color: '#C62828', fontSize: 14, fontWeight: '700',
  },
  errorText: { color: '#C62828', fontSize: 12, flex: 1, textAlign: 'left' },
});
