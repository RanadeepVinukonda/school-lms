import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthState, UserProfile } from '../types';

interface AuthStore extends AuthState {
  setUser: (user: UserProfile | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

/**
 * Creates a storage adapter for zustand persist middleware.
 * Uses AsyncStorage when available (React Native), falls back to in-memory (testing / SSR).
 * 
 * In production, install @react-native-async-storage/async-storage and uncomment the import:
 *   import AsyncStorage from '@react-native-async-storage/async-storage';
 * Then change storage to: createJSONStorage(() => AsyncStorage)
 */
const createStorage = () => {
  try {
    const AsyncStorage =
      typeof window !== 'undefined' && (window as any).AsyncStorage
        ? (window as any).AsyncStorage
        : null;
    if (AsyncStorage) {
      return createJSONStorage(() => AsyncStorage);
    }
  } catch {
    // AsyncStorage not available — use memory fallback
  }
  // In-memory fallback for environments without AsyncStorage
  const store = new Map<string, string>();
  return createJSONStorage(() => ({
    getItem: (key: string) => Promise.resolve(store.get(key) ?? null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      store.delete(key);
      return Promise.resolve();
    },
  }));
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set((state) => ({ token, isAuthenticated: !!token && !!state.user })),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'lms-mobile-auth',
      storage: createStorage(),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
    },
  ),
);
