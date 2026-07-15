import React, { useCallback, useRef, useState, useMemo } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, StatusBar } from 'react-native';
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
      if (data.type === 'jsError' || data.type === 'consoleError') {
        setError(data.message);
      }
    } catch {}
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAF5" />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2B3D5E" />
          </View>
        )}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText} numberOfLines={5}>{error}</Text>
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: WEBSITE_URL }}
          style={styles.webview}
          onLoadEnd={onLoadEnd}
          onError={onError}
          onMessage={onMessage}
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
  errorText: { color: '#C62828', fontSize: 12, textAlign: 'center' },
});
