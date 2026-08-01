import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.school.lms',
  appName: 'Genesis',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'school-lms-api-b8cn.onrender.com',
    ],
  },
};

export default config;
