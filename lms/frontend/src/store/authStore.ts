import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/supabase/config';
import api from '@/services/api';
import { hasRole as userHasRole } from '@/lib/roleHelpers';
import type { UserProfile, UserRole } from '@/types';

interface AuthStore {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  hasRole: (roles: UserRole[]) => boolean;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

let initialized = false;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) =>
        set({ user, isAuthenticated: !!user, isLoading: false }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      hasRole: (roles) => {
        const user = get().user;
        if (!user) return false;
        return roles.some(r => userHasRole(user.role, r));
      },
      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      },
      initialize: async () => {
        if (initialized) return;
        initialized = true;
        set({ isLoading: true });

        try {
          const res = await api.get('/auth/session');
          const sessionData = res.data?.data;

          if (sessionData?.user) {
            const p = sessionData.user as Record<string, unknown>;

            let effectiveRole = (p.role as string) || 'student';

            if (effectiveRole === 'teacher' || effectiveRole === 'parent') {
              try {
                const tcsRes = await api.get('/teacher-class-subject/my');
                const assignments = tcsRes.data?.data || tcsRes.data || [];
                if (assignments.length > 0 && effectiveRole === 'parent') {
                  effectiveRole = 'parent,teacher';
                }
              } catch { /* assignments not available yet */ }
            }

            set({
              user: {
                id: p.id as string,
                email: (p.email as string) || '',
                displayName: (p.displayName as string) || (p.email as string)?.split('@')[0] || 'User',
                role: effectiveRole,
                isActive: (p.isActive as boolean) ?? true,
                avatar: (p.photoURL as string) || undefined,
                firstName: p.firstName as string | undefined,
                lastName: p.lastName as string | undefined,
                phone: (p.phoneNumber as string) || undefined,
                dateOfBirth: p.dateOfBirth as string | undefined,
                bio: p.bio as string | undefined,
                address: p.address as string | undefined,
                studentId: p.studentId as string | undefined,
                teacherId: p.teacherId as string | undefined,
                tutorialSeen: p.tutorialSeen as boolean | undefined,
                language: p.language as string | undefined,
                createdAt: (p.created_at as string) || new Date().toISOString(),
                updatedAt: (p.updated_at as string) || new Date().toISOString(),
              },
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'lms-auth-v2',
      partialize: (state) => ({
        user: state.user,
      }),
    },
  ),
);
