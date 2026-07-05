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

/** Map a backend user profile object to the normalized store shape. */
function mapProfileToUser(
  p: Record<string, unknown>,
  effectiveRole: string,
): UserProfile {
  return {
    id: p.id as string,
    email: (p.email as string) || '',
    displayName:
      (p.displayName as string) ||
      (p.email as string)?.split('@')[0] ||
      'User',
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
    classIds: p.classIds as string[] | undefined,
    classId: p.classId as string | undefined,
    createdAt: (p.created_at as string) || new Date().toISOString(),
    updatedAt: (p.updated_at as string) || new Date().toISOString(),
  };
}

/** Resolve the effective role, checking teacher-class-subject assignments if needed. */
async function resolveEffectiveRole(
  profile: Record<string, unknown>,
): Promise<string> {
  let effectiveRole = (profile.role as string) || 'student';

  if (effectiveRole === 'teacher' || effectiveRole === 'parent') {
    try {
      const tcsRes = await api.get('/teacher-class-subject/my');
      const assignments = tcsRes.data?.data || tcsRes.data || [];
      if (assignments.length > 0 && effectiveRole === 'parent') {
        effectiveRole = 'parent,teacher';
      }
    } catch {
      // assignments not available yet
    }
  }

  return effectiveRole;
}

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
          // 1. Try restoring session from Supabase client (persisted in localStorage)
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.access_token) {
            // Store token so it's available in the store
            set({ token: session.access_token });

            // Use /auth/me (authenticate middleware verifies the Bearer token
            // which is automatically attached by our request interceptor)
            const res = await api.get('/auth/me');
            const profile = res.data?.data as Record<string, unknown> | undefined;

            if (profile) {
              const effectiveRole = await resolveEffectiveRole(profile);
              set({
                user: mapProfileToUser(profile, effectiveRole),
                isAuthenticated: true,
                isLoading: false,
              });
              return;
            }
          }

          // 2. Try persisted token from Zustand store (survives Supabase session expiry)
          const persistedToken = get().token;
          if (persistedToken) {
            try {
              const res = await api.get('/auth/me', {
                headers: { Authorization: `Bearer ${persistedToken}` },
              });
              const profile = res.data?.data as Record<string, unknown> | undefined;
              if (profile) {
                const effectiveRole = await resolveEffectiveRole(profile);
                set({
                  token: persistedToken,
                  user: mapProfileToUser(profile, effectiveRole),
                  isAuthenticated: true,
                  isLoading: false,
                });
                return;
              }
            } catch {
              // Token invalid — clear it and fall through
              set({ token: null });
            }
          }

          // 3. Fallback: try cookie-based /auth/session (legacy path)
          const res = await api.get('/auth/session');
          const sessionData = res.data?.data;

          if (sessionData?.user) {
            const p = sessionData.user as Record<string, unknown>;
            const effectiveRole = await resolveEffectiveRole(p);
            set({
              user: mapProfileToUser(p, effectiveRole),
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
        token: state.token,
      }),
    },
  ),
);
