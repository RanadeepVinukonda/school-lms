import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/supabase/config';
import api, { startTokenRefresh } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import { getPrimaryRole } from '@/lib/roleHelpers';
import type { LoginInput, OtpVerifyInput, ApiError, UserRole } from '@/types';

function setupDashboard(role: string): string {
  const primaryRole = getPrimaryRole(role);
  switch (primaryRole) {
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

async function fetchProfile(uid: string, sessionToken: string, sessionRefreshToken: string) {
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', uid)
    .single();

  if (profileError || !profile) {
    throw new Error('User profile not found');
  }

  const p = profile as Record<string, unknown>;
  let role = (p.role as string) || 'student';

  if (role === 'parent') {
    try {
      const { data: tcsData } = await supabase
        .from('firestore_docs')
        .select('doc_id')
        .eq('collection', 'teacherClassSubject')
        .filter('data->>teacherId', 'eq', uid)
        .limit(1);
      if (tcsData && tcsData.length > 0) {
        role = 'parent,teacher';
      }
    } catch (e) {
      console.warn('[useLogin] parent-teacher role check failed:', e instanceof Error ? e.message : String(e));
    }
  }

  return {
    uid,
    email: (p.email as string) || '',
    displayName: (p.display_name as string) || 'User',
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
    phone: (p.phone_number as string) || undefined,
    dateOfBirth: p.date_of_birth as string | undefined,
    bio: p.bio as string | undefined,
    address: p.address as string | undefined,
    createdAt: (p.created_at as string) || new Date().toISOString(),
    updatedAt: (p.updated_at as string) || new Date().toISOString(),
    token: sessionToken,
    refreshToken: sessionRefreshToken,
  };
}

function handleLoginSuccess(
  result: { uid: string; email: string; displayName: string; role: string; isActive: boolean; avatar?: string; studentId?: string; classId?: string; classIds?: string[]; teacherId?: string; firstName?: string; lastName?: string; phone?: string; dateOfBirth?: string; bio?: string; address?: string; tutorialSeen?: boolean; createdAt: string; updatedAt: string; token: string; refreshToken: string },
  navigate: ReturnType<typeof useNavigate>,
  location: ReturnType<typeof useLocation>,
  setToken: (token: string | null) => void,
  setUser: (user: any) => void,
) {
  const { uid, email, displayName, role, isActive, avatar, studentId, classId, classIds, teacherId, firstName, lastName, phone, dateOfBirth, bio, address, tutorialSeen, createdAt, updatedAt, token, refreshToken } = result;
  setToken(token);
  setUser({ id: uid, email, displayName, role, isActive, avatar, studentId, classId, classIds, teacherId, firstName, lastName, phone, dateOfBirth, bio, address, tutorialSeen, createdAt, updatedAt });
  api.post('/auth/refresh', { refresh_token: refreshToken }).catch(() => {});
  startTokenRefresh();
  toast.success('Welcome back!');
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
  navigate(from || setupDashboard(role), { replace: true });
}

function getErrorMessage(error: ApiError): string {
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
  return errorMessages[error.message || ''] || error.message || 'Login failed';
}

export function useLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setToken } = useAuthStore();

  return useMutation({
    mutationFn: async (data: LoginInput) => {
      if (data.phone) {
        const { data: authData, error } = await supabase.auth.signInWithOtp({
          phone: data.phone,
        });
        if (error) throw error;
        return { otpSent: true, phone: data.phone };
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email!,
        password: data.password!,
      });
      if (error) throw error;
      if (!authData.user) throw new Error('Login failed');
      if (!authData.session) throw new Error('No session returned');

      return fetchProfile(authData.user.id, authData.session.access_token, authData.session.refresh_token);
    },
    onSuccess: (result) => {
      if (result && 'otpSent' in result) return;
      handleLoginSuccess(result as any, navigate, location, setToken, setUser);
    },
    onError: (error: ApiError) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useVerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setToken } = useAuthStore();

  return useMutation({
    mutationFn: async (data: OtpVerifyInput) => {
      const { data: authData, error } = await supabase.auth.verifyOtp({
        phone: data.phone,
        token: data.token,
        type: 'sms',
      });
      if (error) throw error;
      if (!authData.user) throw new Error('Verification failed');
      if (!authData.session) throw new Error('No session returned');

      return fetchProfile(authData.user.id, authData.session.access_token, authData.session.refresh_token);
    },
    onSuccess: (result) => {
      handleLoginSuccess(result, navigate, location, setToken, setUser);
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Invalid OTP. Please try again.');
    },
  });
}
