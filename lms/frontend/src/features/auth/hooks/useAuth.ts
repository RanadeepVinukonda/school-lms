import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { onAuthChange } from '@/firebase/auth';

export function useAuth() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const initialCheckDone = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (initialCheckDone.current) return;
      initialCheckDone.current = true;

      if (firebaseUser) {
        let role = 'student';
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult();
          role = idTokenResult.claims.role as string || 'student';
        } catch {
          role = 'student';
        }
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
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
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setLoading]);
}
