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
      backgroundColor: '#8DA6E2',
      androidScaleType: 'FIT_CENTER',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#00000000',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
