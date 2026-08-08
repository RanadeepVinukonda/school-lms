import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, StatusBar, TouchableOpacity } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

const WEBSITE_URL = 'https://genesis-frontend-teal.vercel.app';

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

  const onLoadEnd = useCallback(() => {
    setLoading(false);
    SplashScreen.hideAsync();
  }, []);

  const onError = useCallback(() => {
    setLoading(false);
    SplashScreen.hideAsync();
  }, []);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      // Only surface real JS errors — console.error noise is filtered out.
      if (data.type === 'jsError') {
        setError(data.message);
      }
    } catch {}
  }, []);

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
