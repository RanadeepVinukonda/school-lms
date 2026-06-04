import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { loginUser } from '@/firebase/auth';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import type { LoginInput, ApiError, UserRole } from '@/types';

function roleDashboard(role: UserRole): string {
  switch (role) {
    case 'admin':
    case 'super_admin':
      return ROUTES.ADMIN_DASHBOARD;
    case 'teacher':
      return ROUTES.TEACHER_DASHBOARD;
    case 'student':
    default:
      return ROUTES.STUDENT_DASHBOARD;
  }
}

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
      const role: UserRole = 'student';
      setUser({
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        role,
        isActive: true,
        avatar: user.photoURL || undefined,
        createdAt: user.metadata.creationTime || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success('Welcome back!');
      navigate(roleDashboard(role), { replace: true });
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
