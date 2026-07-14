import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { supabase } from '@/supabase/config';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import { getPrimaryRole } from '@/lib/roleHelpers';
import type { RegisterInput, ApiError } from '@/types';

function setupDashboard(role: string): string {
  const primaryRole = getPrimaryRole(role);
  switch (primaryRole) {
    case 'admin':
    case 'super_admin':
      return ROUTES.ADMIN_DASHBOARD;
    case 'teacher':
      return ROUTES.TEACHER_DASHBOARD;
    case 'student':
    default:
      return ROUTES.STUDENT_ROLL_NUMBER;
  }
}

export function useRegister() {
  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();

  return useMutation({
    mutationFn: async (data: RegisterInput) => {
      await authService.register({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        role: data.role,
      });
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      const uid = authData.user?.id || '';
      const token = authData.session?.access_token || '';
      return { uid, token, role: data.role };
    },
    onSuccess: async ({ uid, token, role }) => {
      setToken(token);
      const { data: userData } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
      if (userData) {
        setUser({
          id: userData.id,
          email: userData.email || '',
          displayName: userData.display_name || '',
          role: (userData.role as string) || role,
          isActive: userData.is_active ?? true,
          avatar: userData.photo_url || undefined,
          studentId: userData.student_id || undefined,
          classId: userData.class_id || undefined,
          tutorialSeen: undefined,
          classIds: userData.class_ids || undefined,
          teacherId: undefined,
          firstName: userData.display_name?.split(' ')[0] || undefined,
          lastName: userData.display_name?.split(' ').slice(1).join(' ') || undefined,
          phone: userData.phone_number || undefined,
          dateOfBirth: undefined,
          bio: undefined,
          address: undefined,
          createdAt: userData.created_at || new Date().toISOString(),
          updatedAt: userData.updated_at || new Date().toISOString(),
        });
      }
      toast.success('Account created successfully!');
      navigate(setupDashboard(role), { replace: true });
    },
    onError: (error: ApiError) => {
      const message =
        error.code === 'auth/email-already-in-use'
          ? 'A user with this email already exists'
          : error.code === 'auth/weak-password'
            ? 'Password is too weak'
            : error.code === 'auth/too-many-requests'
              ? 'Too many attempts. Please try again later'
              : error.message || 'Registration failed';
      toast.error(message);
    },
  });
}
