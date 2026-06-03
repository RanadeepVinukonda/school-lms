import { useAuthStore } from '@/store/authStore';
import StudentDashboardPage from '@/app/pages/student/StudentDashboardPage';
import TeacherDashboardPage from '@/app/pages/teacher/TeacherDashboardPage';
import AdminDashboardPage from '@/app/pages/admin/AdminDashboardPage';

export default function RoleAwareDashboard() {
  const role = useAuthStore((s) => s.user?.role);

  switch (role) {
    case 'teacher':
      return <TeacherDashboardPage />;
    case 'admin':
    case 'super_admin':
      return <AdminDashboardPage />;
    default:
      return <StudentDashboardPage />;
  }
}
