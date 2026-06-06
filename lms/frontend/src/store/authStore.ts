import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
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
        return roles.includes(user.role);
      },
      logout: async () => {
        await firebaseSignOut(auth);
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      },
      initialize: async () => {
        if (initialized) return;
        initialized = true;
        set({ isLoading: true });
        onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            try {
              const docRef = doc(db, 'users', firebaseUser.uid);
              const snap = await getDoc(docRef);
              if (snap.exists()) {
                const data = snap.data() as Record<string, unknown>;
                const profile: UserProfile = {
                  id: snap.id,
                  email: (data.email as string) || firebaseUser.email || '',
                  displayName: (data.displayName as string) || firebaseUser.displayName || '',
                  role: (data.role as UserRole) || 'student',
                  isActive: data.isActive as boolean ?? true,
                  avatar: data.avatar as string | undefined,
                  firstName: data.firstName as string | undefined,
                  lastName: data.lastName as string | undefined,
                  phone: data.phone as string | undefined,
                  dateOfBirth: data.dateOfBirth as string | undefined,
                  bio: data.bio as string | undefined,
                  address: data.address as string | undefined,
                  classIds: data.classIds as string[] | undefined,
                  studentId: data.studentId as string | undefined,
                  teacherId: data.teacherId as string | undefined,
                  classId: data.classId as string | undefined,
                  createdAt: (data.createdAt as string) || new Date().toISOString(),
                  updatedAt: (data.updatedAt as string) || new Date().toISOString(),
                };
                set({ user: profile, isAuthenticated: true, isLoading: false });
              } else {
                set({ user: null, isAuthenticated: false, isLoading: false });
              }
            } catch (err) {
              set({ user: null, isAuthenticated: false, isLoading: false });
            }
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        });
      },
    }),
    {
      name: 'lms-auth-v2',
      partialize: (state) => ({
        token: state.token,
      }),
    },
  ),
);
