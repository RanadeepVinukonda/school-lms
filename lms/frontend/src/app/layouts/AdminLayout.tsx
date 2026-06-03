import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { isAdmin } from '@/utils/permissions';

export function AdminLayout() {
  const { sidebarCollapsed } = useUIStore();
  const user = useAuthStore((s) => s.user);

  if (!user || !isAdmin(user.role)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300 ease-in-out',
          'lg:ml-[280px]',
          sidebarCollapsed && 'lg:ml-[72px]',
          'pb-20 lg:pb-8',
        )}
      >
        <Header />
        <main className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
