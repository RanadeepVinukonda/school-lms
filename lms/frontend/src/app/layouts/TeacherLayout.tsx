import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { UserAvatar } from '@/components/layout/UserAvatar';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const sidebarNavItems: NavItem[] = [
  { label: 'Home', href: ROUTES.TEACHER_DASHBOARD, icon: 'home' },
  { label: 'Students', href: ROUTES.TEACHER_STUDENTS, icon: 'group' },
  { label: 'Exams', href: ROUTES.TEACHER_EXAMS, icon: 'assignment' },
  { label: 'Textbooks', href: ROUTES.TEACHER_TEXTBOOKS, icon: 'menu_book' },
  { label: 'Profile', href: ROUTES.TEACHER_PROFILE, icon: 'person' },
];

const bottomNavItems: NavItem[] = [
  { label: 'Home', href: ROUTES.TEACHER_DASHBOARD, icon: 'home' },
  { label: 'Students', href: ROUTES.TEACHER_STUDENTS, icon: 'group' },
  { label: 'Exams', href: ROUTES.TEACHER_EXAMS, icon: 'assignment' },
  { label: 'Textbooks', href: ROUTES.TEACHER_TEXTBOOKS, icon: 'menu_book' },
  { label: 'Profile', href: ROUTES.TEACHER_PROFILE, icon: 'person' },
];

export default function TeacherLayout() {
  const user = useAuthStore((s) => s.user);
  const { sidebarCollapsed, sidebarOpen, setSidebarOpen, setSidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full border-r bg-card transition-all duration-300 ease-in-out flex flex-col',
          sidebarCollapsed ? 'w-[72px]' : 'w-[280px]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Sidebar header */}
        <div
          className={cn(
            'flex items-center h-16 border-b px-4',
            sidebarCollapsed ? 'justify-center' : 'justify-between',
          )}
        >
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Icon name="auto_stories" size={20} className="text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">Genesis</span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Icon name="auto_stories" size={20} className="text-primary-foreground" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex"
          >
            <Icon name={sidebarCollapsed ? 'chevron_right' : 'chevron_left'} size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <Icon name="close" size={18} />
          </Button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {sidebarNavItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground',
                  sidebarCollapsed && 'justify-center px-2',
                )
              }
            >
              <Icon name={item.icon} size={22} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User info at bottom */}
        {!sidebarCollapsed && user && (
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-bold uppercase text-muted-foreground">
                {user.displayName
                  ? user.displayName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : user.email[0].toUpperCase()}
              </div>
              <div className="flex-1 truncate">
                <p className="text-sm font-medium">{user.displayName}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main content area */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out',
          'lg:ml-[280px]',
          sidebarCollapsed && 'lg:ml-[72px]',
          'pb-20 lg:pb-8',
        )}
      >
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            <Icon name="menu" size={24} />
          </Button>

          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Icon name="auto_stories" size={18} className="text-primary-foreground" />
            </div>
            <span className="font-bold">Genesis</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {user && <NotificationBell />}
            {user && <UserAvatar />}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>

        {/* Bottom navigation (mobile) */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background lg:hidden">
          <div className="flex items-center justify-around h-16 px-2">
            {bottomNavItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                <Icon name={item.icon} size={22} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
