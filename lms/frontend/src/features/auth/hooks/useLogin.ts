import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { loginUser } from '@/firebase/auth';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import type { LoginInput, ApiError } from '@/types';

export function useLogin() {
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthStore();

  return useMutation({
    mutationFn: async (data: LoginInput) => {
      const user = await loginUser(data.email, data.password);
      const token = await user.getIdToken();
      return { user, token };
    },
    onSuccess: async ({ user, token }) => {
      setToken(token);
      setUser({
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        role: 'student',
        isActive: true,
        avatar: user.photoURL || undefined,
        createdAt: user.metadata.creationTime || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success('Welcome back!');
      navigate(ROUTES.DASHBOARD, { replace: true });
    },
    onError: (error: ApiError) => {
      const errorMessages: Record<string, string> = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Invalid email or password',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/invalid-email': 'Invalid email address',
        'auth/user-disabled': 'This account has been disabled',
        'auth/too-many-requests': 'Too many attempts. Please try again later',
      };
      const message = errorMessages[error.code || ''] || error.message || 'Login failed';
      toast.error(message);
    },
  });
}
