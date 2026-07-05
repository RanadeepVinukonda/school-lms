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

/** Read persisted token from localStorage directly (bypasses zustand persist rehydration timing). */
function readPersistedToken(): string | null {
  try {
    const raw = localStorage.getItem('lms-auth-v2');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
}

/** Format error for logging — handles plain objects (ApiError) that aren't Error instances. */
function formatError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const obj = e as Record<string, unknown>;
    return (obj.message as string) || JSON.stringify(obj);
  }
  return String(e);
}

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

/** Resolve effective role — only makes network call for parent (composite role check). */
async function resolveEffectiveRole(
  profile: Record<string, unknown>,
): Promise<string> {
  const role = (profile.role as string) || 'student';
  if (role !== 'parent') return role;

  try {
    const tcsRes = await api.get('/teacher-class-subject/my', { timeout: 10000 });
    const assignments = tcsRes.data?.data || tcsRes.data || [];
    return assignments.length > 0 ? 'parent,teacher' : role;
  } catch {
    return role;
  }
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) =>
        set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      hasRole: (roles) => {
        const user = get().user;
        if (!user) return false;
        return roles.some(r => userHasRole(user.role, r));
      },
      logout: async () => {
        await supabase.auth.signOut();
        initialized = false;
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      },
      initialize: async () => {
        if (initialized) return;
        initialized = true;
        set({ isLoading: true });

        // Step 1: Supabase client session + /auth/me
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            set({ token: session.access_token });
            const res = await api.get('/auth/me', { timeout: 10000 });
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
        } catch (e) {
          console.warn('[authStore] Step 1 (Supabase session) failed:', formatError(e));
          set({ isLoading: false });
        }

        // Step 2: Persisted store token + /auth/me
        try {
          set({ isLoading: true });
          const persistedToken = get().token || readPersistedToken();
          if (persistedToken) {
            const res = await api.get('/auth/me', {
              headers: { Authorization: `Bearer ${persistedToken}` },
              timeout: 10000,
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
          }
        } catch (e) {
          console.warn('[authStore] Step 2 (persisted token) failed:', formatError(e));
          set({ token: null, isLoading: false });
        }

        // Step 3: Cookie-based /auth/session
        try {
          set({ isLoading: true });
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
            return;
          }
        } catch (e) {
          console.warn('[authStore] Step 3 (cookie session) failed:', formatError(e));
          set({ isLoading: false });
        }

        // All steps failed
        set({ user: null, isAuthenticated: false, isLoading: false });
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
