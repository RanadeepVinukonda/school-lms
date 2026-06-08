import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { loginUser } from '@/firebase/auth';
import { db } from '@/firebase/config';
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
      const firebaseUser = await loginUser(data.email, data.password);
      const token = await firebaseUser.getIdToken();

      const docRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        throw new Error('User profile not found');
      }
      const userData = snap.data() as Record<string, unknown>;
      const role = (userData.role as UserRole) || 'student';

      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || (userData.email as string) || '',
        displayName: (userData.displayName as string) || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        role,
        isActive: (userData.isActive as boolean) ?? true,
        avatar: (userData.avatar as string) || firebaseUser.photoURL || undefined,
        studentId: userData.studentId as string | undefined,
        classId: userData.classId as string | undefined,
        classIds: userData.classIds as string[] | undefined,
        teacherId: userData.teacherId as string | undefined,
        firstName: userData.firstName as string | undefined,
        lastName: userData.lastName as string | undefined,
        phone: userData.phone as string | undefined,
        dateOfBirth: userData.dateOfBirth as string | undefined,
        bio: userData.bio as string | undefined,
        address: userData.address as string | undefined,
        createdAt: (userData.createdAt as string) || firebaseUser.metadata.creationTime || new Date().toISOString(),
        updatedAt: (userData.updatedAt as string) || new Date().toISOString(),
        token,
      };
    },
    onSuccess: ({ uid, email, displayName, role, isActive, avatar, studentId, classId, classIds, teacherId, firstName, lastName, phone, dateOfBirth, bio, address, createdAt, updatedAt, token }) => {
      setToken(token);
      setUser({ id: uid, email, displayName, role, isActive, avatar, studentId, classId, classIds, teacherId, firstName, lastName, phone, dateOfBirth, bio, address, createdAt, updatedAt });
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
      };
      const message = errorMessages[error.code || ''] || error.message || 'Login failed';
      toast.error(message);
    },
  });
}
