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

const bottomNavItems: NavItem[] = [
  { label: 'Home', href: ROUTES.STUDENT_DASHBOARD, icon: 'home' },
  { label: 'Subjects', href: ROUTES.STUDENT_SUBJECTS, icon: 'book' },
  { label: 'Exams', href: ROUTES.STUDENT_EXAMS, icon: 'assignment' },
  { label: 'Timetable', href: ROUTES.STUDENT_TIMETABLE, icon: 'calendar_month' },
  { label: 'Profile', href: ROUTES.STUDENT_PROFILE, icon: 'person' },
];

export default function StudentLayout() {
  const user = useAuthStore((s) => s.user);
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 hidden h-full w-[280px] border-r bg-card transition-transform duration-300 lg:flex lg:flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Icon name="auto_stories" size={20} className="text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">Genesis</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Navigation
          </p>
          <div className="space-y-1">
            {bottomNavItems.map((item) => (
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
                  )
                }
              >
                <Icon name={item.icon} size={22} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="border-t p-4">
          {user && (
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
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className="lg:ml-[280px]">
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
        <main className="min-h-[calc(100vh-8rem)] p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
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
