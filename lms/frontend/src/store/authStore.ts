import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/supabase/config';
import api, { startTokenRefresh, stopTokenRefresh } from '@/services/api';
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

let initPromise: Promise<void> | null = null;
/** Cache resolved effective role for parent users (avoid repeated /teacher-class-subject/my calls). */
let cachedEffectiveRole: string | null = null;

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

/** Resolve effective role — only makes network call for parent (composite role check). Cached after first call. */
async function resolveEffectiveRole(
  profile: Record<string, unknown>,
): Promise<string> {
  const role = (profile.role as string) || 'student';
  if (role !== 'parent') return role;
  if (cachedEffectiveRole) return cachedEffectiveRole;

  try {
    const tcsRes = await api.get('/teacher-class-subject/my', { timeout: 10000 });
    const assignments = tcsRes.data?.data || tcsRes.data || [];
    cachedEffectiveRole = assignments.length > 0 ? 'parent,teacher' : role;
    return cachedEffectiveRole;
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
    stopTokenRefresh();
    cachedEffectiveRole = null;
    await supabase.auth.signOut();
    initPromise = null;
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },
  initialize: async () => {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      // If we already have a persisted session, restore it immediately
      // and only validate in the background — never show login if we have cached auth.
      if (get().user && get().token) {
        set({ isLoading: false });
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            set({ token: session.access_token });
            // Validate the session is still active — DON'T replace the persisted user
            // because /auth/me returns a ServiceResult wrapper that doesn't carry all
            // identity fields (id, displayName, firstName, lastName, teacherId, etc.).
            // The persisted user from the original login has the COMPLETE profile.
            await api.post('/auth/verify-token', {}, { timeout: 10000 });
          }
        } catch {
          // Background validation failed — keep persisted state, user stays logged in
        }
        return;
      }

      set({ isLoading: true });

      try {
        // Step 1: Cookie-based session (httpOnly cookie, XSS-safe)
        const res = await api.get(`/auth/session?t=${Date.now()}`);
        const sessionData = res.data?.data;
        if (sessionData?.user) {
          const p = sessionData.user as Record<string, unknown>;
          const existing = get().user;
          const serverRole = p.role as string | undefined;
          const effectiveRole = serverRole ? await resolveEffectiveRole(p) : (existing?.role || 'student');
          set({
            user: mapProfileToUser(p, effectiveRole),
            isAuthenticated: true,
            isLoading: false,
          });
          startTokenRefresh();
          return;
        }
      } catch {
        // Cookie session not available
      }

      try {
        // Step 2: Supabase SDK session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          set({ token: session.access_token });
          const res = await api.get(`/auth/me?t=${Date.now()}`, { timeout: 10000 });
          const body = res.data?.data as Record<string, unknown> | undefined;
          // Unwrap ServiceResult if present (backend wraps getUserProfile result)
          const profile = (body?.data ?? body) as Record<string, unknown> | undefined;
          if (profile) {
            const existing = get().user;
            const serverRole = profile.role as string | undefined;
            const effectiveRole = serverRole ? await resolveEffectiveRole(profile) : (existing?.role || 'student');
            const mapped = mapProfileToUser(profile, effectiveRole);
            if (!mapped.classId && existing?.classId) mapped.classId = existing.classId;
            if (!mapped.studentId && existing?.studentId) mapped.studentId = existing.studentId;
            set({
              user: mapped,
              isAuthenticated: true,
              isLoading: false,
            });
            startTokenRefresh();
            return;
          }
        }
      } catch (e) {
        console.warn('[authStore] Auth initialization failed:', e instanceof Error ? e.message : String(e));
      }

      // ALWAYS keep any persisted session — only clear on explicit logout.
      // This ensures closing / swiping away the app never forces re-login.
      set({ isLoading: false });
    })();
    return initPromise;
  },
}),
  {
    name: 'lms-auth',
    partialize: (state) => ({
      user: state.user,
      token: state.token,
      isAuthenticated: state.isAuthenticated,
    }),
  },
));
