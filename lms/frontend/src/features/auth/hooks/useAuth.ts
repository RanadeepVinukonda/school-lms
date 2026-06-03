import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { onAuthChange } from '@/firebase/auth';

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, setLoading } = useAuthStore();

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
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setLoading]);

  return { user, isAuthenticated, isLoading };
}
