import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { registerUser } from '@/firebase/auth';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import type { RegisterInput, ApiError } from '@/types';

export function useRegister() {
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthStore();

  return useMutation({
    mutationFn: async (data: RegisterInput) => {
      const user = await registerUser(data.email, data.password);
      const token = await user.getIdToken();
      return { user, token, displayName: data.displayName, role: data.role };
    },
    onSuccess: async ({ user, token, displayName, role }) => {
      setToken(token);
      setUser({
        id: user.uid,
        email: user.email || '',
        displayName,
        role,
        isActive: true,
        createdAt: user.metadata.creationTime || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success('Account created successfully!');
      navigate(ROUTES.DASHBOARD, { replace: true });
    },
    onError: (error: ApiError) => {
      const errorMessages: Record<string, string> = {
        'auth/email-already-in-use': 'An account with this email already exists',
        'auth/invalid-email': 'Invalid email address',
        'auth/weak-password': 'Password is too weak',
        'auth/too-many-requests': 'Too many attempts. Please try again later',
      };
      const message = errorMessages[error.code || ''] || error.message || 'Registration failed';
      toast.error(message);
    },
  });
}
