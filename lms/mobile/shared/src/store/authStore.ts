import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthState, UserProfile } from '../types';

interface AuthStore extends AuthState {
  setUser: (user: UserProfile | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

const createStorage = () => {
  return createJSONStorage(() => AsyncStorage);
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
