import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['reactflow', '@radix-ui', 'lucide-react'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer, dev }) => {
    // Path alias: react-router-dom → our compatibility shim
    config.resolve.alias['react-router-dom'] = path.resolve(__dirname, 'src/compat/react-router-dom.tsx');
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    // Legacy src/app/ → new src/app/ doesn't break old @/app/* imports
    config.resolve.alias['@/app'] = path.resolve(__dirname, 'src/legacy');

    // Firebase config plugin (replaces Vite firebaseConfigPlugin)
    // Write firebase-config.json to public/ at build time
    if (!isServer && !dev) {
      const envPath = path.resolve(__dirname, '.env');
      const env = {};
      if (fs.existsSync(envPath)) {
        fs.readFileSync(envPath, 'utf-8').split('\n').forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...rest] = trimmed.split('=');
            env[key.trim()] = rest.join('=').trim();
          }
        });
      }
      const firebaseConfig = {
        apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
        authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
        measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
      };
      const publicDir = path.resolve(__dirname, 'public');
      fs.mkdirSync(publicDir, { recursive: true });
      fs.writeFileSync(
        path.resolve(publicDir, 'firebase-config.json'),
        JSON.stringify(firebaseConfig, null, 2),
      );
    }

    return config;
  },
};

export default nextConfig;
