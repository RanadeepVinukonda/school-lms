import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import type { UserRole } from '@/types';

function roleDashboard(role: UserRole): string {
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

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
  checkSetup?: boolean;
}

export function ProtectedRoute({ children, roles, checkSetup }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSkeleton type="detail" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={roleDashboard(user.role)} replace />;
  }

  if (checkSetup) {
    if (user.role === 'student' && !user.classId) {
      return <Navigate to={ROUTES.STUDENT_ROLL_NUMBER} replace />;
    }
  }

  return <>{children}</>;
}
