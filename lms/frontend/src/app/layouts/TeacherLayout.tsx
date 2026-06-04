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

const navItems: NavItem[] = [
  { label: 'Home', href: ROUTES.TEACHER_DASHBOARD, icon: 'home' },
  { label: 'Students', href: ROUTES.TEACHER_STUDENTS, icon: 'group' },
  { label: 'Exams', href: ROUTES.TEACHER_EXAMS, icon: 'assignment' },
  { label: 'Textbooks', href: ROUTES.TEACHER_TEXTBOOKS, icon: 'menu_book' },
  { label: 'Profile', href: ROUTES.TEACHER_PROFILE, icon: 'person' },
];

export default function TeacherLayout() {
  const user = useAuthStore((s) => s.user);
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop nav rail */}
      <aside
        className={cn(
          'hidden lg:flex fixed top-0 left-0 z-50 h-full border-r border-outline-variant bg-surface transition-all duration-300 ease-in-out flex-col',
          sidebarCollapsed ? 'w-20' : 'w-64',
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            'flex items-center h-16 border-b border-outline-variant shrink-0',
            sidebarCollapsed ? 'justify-center' : 'justify-between px-4',
          )}
        >
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <Icon name="auto_stories" size={20} className="text-primary-foreground" />
              </div>
              <span className="text-title-sm">Genesis</span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Icon name="auto_stories" size={20} className="text-primary-foreground" />
            </div>
          )}
          <Button
            variant="text"
            size="icon-sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-on-surface-variant"
          >
            <Icon name={sidebarCollapsed ? 'chevron_right' : 'chevron_left'} size={18} />
          </Button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-variant/50',
                  sidebarCollapsed && 'justify-center px-2',
                )
              }
            >
              <Icon name={item.icon} size={24} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className={cn('border-t border-outline-variant p-4 shrink-0', sidebarCollapsed && 'flex justify-center')}>
          {user && (
            <div className={cn('flex items-center gap-3', sidebarCollapsed && 'flex-col')}>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-on-primary-container text-label-sm">
                {user.displayName
                  ? user.displayName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : user.email[0].toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 truncate">
                  <p className="text-sm font-medium">{user.displayName}</p>
                  <p className="text-label-sm text-on-surface-variant capitalize">{user.role}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out pb-22 lg:pb-8',
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64',
        )}
      >
        {/* Top app bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-outline-variant bg-surface/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-surface/60">
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {user && <NotificationBell />}
            {user && <UserAvatar />}
          </div>
        </header>

        <main className="min-h-[calc(100vh-8rem)]">
          <Outlet />
        </main>

        {/* Bottom navigation (mobile only) */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 h-20 bg-surface border-t border-outline-variant lg:hidden">
          <div className="flex items-center justify-around h-full px-2">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-w-0 flex-1 h-full',
                    isActive
                      ? 'text-primary'
                      : 'text-on-surface-variant hover:text-on-surface',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                    )}
                    <Icon name={item.icon} size={24} className={cn(isActive ? 'fill-icon' : '')} />
                    <span className="text-label-sm">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
