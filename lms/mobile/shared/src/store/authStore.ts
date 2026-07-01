import { create } from 'zustand';
import type { AuthState, UserProfile } from '../types';

interface AuthStore extends AuthState {
  setUser: (user: UserProfile | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => set((state) => ({ token, isAuthenticated: !!token && !!state.user })),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, token: null, isAuthenticated: false }),
}));
