import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import { db } from '@/firebase/config';
import { loginUser } from '@/firebase/auth';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import type { RegisterInput, ApiError, UserRole } from '@/types';

function setupDashboard(role: UserRole): string {
  switch (role) {
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
      const firebaseUser = await loginUser(data.email, data.password);
      const token = await firebaseUser.getIdToken();
      return { uid: firebaseUser.uid, token, role: data.role };
    },
    onSuccess: async ({ uid, token, role }) => {
      setToken(token);
      const docRef = doc(db, 'users', uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data();
        setUser({
          id: snap.id,
          email: (d.email as string) || '',
          displayName: (d.displayName as string) || '',
          role: (d.role as UserRole) || role,
          isActive: (d.isActive as boolean) ?? true,
          avatar: d.avatar as string | undefined,
          studentId: d.studentId as string | undefined,
          classId: d.classId as string | undefined,
          tutorialSeen: d.tutorialSeen as boolean | undefined,
          classIds: d.classIds as string[] | undefined,
          teacherId: d.teacherId as string | undefined,
          firstName: d.firstName as string | undefined,
          lastName: d.lastName as string | undefined,
          phone: d.phone as string | undefined,
          dateOfBirth: d.dateOfBirth as string | undefined,
          bio: d.bio as string | undefined,
          address: d.address as string | undefined,
          createdAt: (d.createdAt as string) || new Date().toISOString(),
          updatedAt: (d.updatedAt as string) || new Date().toISOString(),
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
