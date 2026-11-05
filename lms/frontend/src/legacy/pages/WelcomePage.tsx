import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getPrimaryRole } from '@/lib/roleHelpers';
import { ROUTES } from '@/lib/constants';

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

export default function WelcomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    // Reopening the app (or landing on /welcome) must never bounce a logged-in
    // user to the login screen — the session is restored from persistent storage.
    if (isAuthenticated && user?.role) {
      navigate(setupDashboard(user.role), { replace: true });
      return;
    }
    navigate(ROUTES.LOGIN, { replace: true });
  }, [isAuthenticated, user, navigate]);

  return null;
}