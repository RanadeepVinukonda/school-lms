import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/firebase/config';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import type { LoginInput, ApiError, UserRole } from '@/types';

function setupDashboard(role: UserRole): string {
  switch (role) {
    case 'admin':
    case 'super_admin':
      return ROUTES.ADMIN_DASHBOARD;
    case 'teacher':
      return ROUTES.TEACHER_DASHBOARD;
    case 'parent':
      return ROUTES.PARENT_DASHBOARD;
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
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      if (!authData.user) throw new Error('Login failed');

      const session = authData.session;
      if (!session) throw new Error('No session returned');

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('User profile not found');
      }

      const p = profile as Record<string, unknown>;
      const role = (p.role as UserRole) || 'student';

      return {
        uid: authData.user.id,
        email: (p.email as string) || authData.user.email || '',
        displayName: (p.display_name as string) || authData.user.email?.split('@')[0] || 'User',
        role,
        isActive: (p.is_active as boolean) ?? true,
        avatar: (p.photo_url as string) || undefined,
        studentId: p.student_id as string | undefined,
        classId: (p.class_id as string) || ((p.class_ids as string[])?.[0]) || undefined,
        tutorialSeen: p.tutorial_seen as boolean | undefined,
        classIds: p.class_ids as string[] | undefined,
        teacherId: p.teacher_id as string | undefined,
        firstName: p.first_name as string | undefined,
        lastName: p.last_name as string | undefined,
        phone: p.phone as string | undefined,
        dateOfBirth: p.date_of_birth as string | undefined,
        bio: p.bio as string | undefined,
        address: p.address as string | undefined,
        createdAt: (p.created_at as string) || new Date().toISOString(),
        updatedAt: (p.updated_at as string) || new Date().toISOString(),
        token: session.access_token,
      };
    },
    onSuccess: ({ uid, email, displayName, role, isActive, avatar, studentId, classId, classIds, teacherId, firstName, lastName, phone, dateOfBirth, bio, address, tutorialSeen, createdAt, updatedAt, token }) => {
      setToken(token);
      setUser({ id: uid, email, displayName, role, isActive, avatar, studentId, classId, classIds, teacherId, firstName, lastName, phone, dateOfBirth, bio, address, tutorialSeen, createdAt, updatedAt });
      toast.success('Welcome back!');
      navigate(setupDashboard(role), { replace: true });
    },
    onError: (error: ApiError) => {
      const errorMessages: Record<string, string> = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Invalid email or password',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/invalid-email': 'Invalid email address',
        'auth/user-disabled': 'This account has been disabled',
        'auth/too-many-requests': 'Too many attempts. Please try again later',
        'Invalid login credentials': 'Invalid email or password',
        'Email not confirmed': 'Please confirm your email address',
      };
      const message = errorMessages[error.message || ''] || error.message || 'Login failed';
      toast.error(message);
    },
  });
}
