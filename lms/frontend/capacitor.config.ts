import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.school.lms',
  appName: 'Genesis',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'https://genesis-frontend-teal.vercel.app',
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: [
      'school-lms-api-b8cn.onrender.com',
      'jfqpukpzgmzwzzjrcxra.supabase.co',
      'school-ca94b.firebaseapp.com',
      'school-ca94b.firebasestorage.app',
      'school-ca94b.firebaseio.com',
      'genesis-frontend-teal.vercel.app',
    ],
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webViewDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#233661',
      androidScaleType: 'FIT_CENTER',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    // Keep the app below the real system status bar: no fake in-app status UI.
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#FFFFFF',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: false,
    },
  },
};

export default config;
