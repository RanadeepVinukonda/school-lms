import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { onAuthChange } from '@/firebase/auth';

export function useAuth() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        let role = 'student';
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult();
          role = idTokenResult.claims.role as string || 'student';
        } catch {
          role = 'student';
        }
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          role: role as 'student' | 'teacher' | 'admin',
          isActive: true,
          avatar: firebaseUser.photoURL || undefined,
          createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        logout();
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setLoading, logout]);
}
