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

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          try {
            set({ token: session.access_token });
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              const p = profile as Record<string, unknown>;
              let classIds = p.class_ids as string[] | undefined;
              let classId = (p.class_id as string) || classIds?.[0];

              // Always fetch teacher assignments — even parents may have teacher access
              let hasTeacherAssignments = false;
              try {
                const tcsRes = await api.get('/teacher-class-subject/my');
                const assignments = tcsRes.data?.data || tcsRes.data || [];
                if (assignments.length > 0) {
                  hasTeacherAssignments = true;
                  classIds = [...new Set(assignments.map((a: any) => a.classId))] as string[];
                  classId = classId || classIds[0];
                }
              } catch { /* assignments not available yet */ }

              // Compute effective roles — parents with teacher assignments can also access teacher portal
              let effectiveRole = (p.role as string) || 'student';
              if (effectiveRole === 'parent' && hasTeacherAssignments) {
                effectiveRole = 'parent,teacher';
              }

              if (classId && !localStorage.getItem('lms-selected-class')) {
                localStorage.setItem('lms-selected-class', classId);
              }

              set({
                user: {
                  id: p.id as string,
                  email: (p.email as string) || session.user.email || '',
                  displayName: (p.display_name as string) || session.user.email?.split('@')[0] || 'User',
                  role: effectiveRole,
                  isActive: (p.is_active as boolean) ?? true,
                  avatar: p.photo_url as string | undefined,
                  firstName: p.first_name as string | undefined,
                  lastName: p.last_name as string | undefined,
                  phone: p.phone as string | undefined,
                  dateOfBirth: p.date_of_birth as string | undefined,
                  bio: p.bio as string | undefined,
                  address: p.address as string | undefined,
                  classIds,
                  studentId: p.student_id as string | undefined,
                  teacherId: p.teacher_id as string | undefined,
                  classId,
                  language: p.language as string | undefined,
                  tutorialSeen: p.tutorial_seen as boolean | undefined,
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
            await supabase.auth.signOut();
            set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          }
        } else {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }

        supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            set({ token: session.access_token });
          } else {
            set({ user: null, token: null, isAuthenticated: false });
          }
        });
      },
    }),
    {
      name: 'lms-auth-v2',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
    },
  ),
);
