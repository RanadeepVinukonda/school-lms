import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { logoutUser } from '@/firebase/auth';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';

export function useLogout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: async () => {
      await logoutUser();
    },
    onSuccess: () => {
      logout();
      toast.success('Logged out successfully');
      navigate(ROUTES.LOGIN, { replace: true });
    },
    onError: () => {
      logout();
      navigate(ROUTES.LOGIN, { replace: true });
    },
  });
}
