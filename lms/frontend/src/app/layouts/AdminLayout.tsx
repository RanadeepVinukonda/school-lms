import { useState, useEffect } from 'react';
import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import { isAdmin } from '@/utils/permissions';
import NotificationDropdown from '@/components/common/NotificationDropdown';
import GlobalSearchDialog from '@/components/common/GlobalSearchDialog';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { UserAvatar } from '@/components/layout/UserAvatar';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.ADMIN_DASHBOARD, icon: 'dashboard' },
  { label: 'Students', href: ROUTES.ADMIN_STUDENTS, icon: 'school' },
  { label: 'Teachers', href: ROUTES.ADMIN_TEACHERS, icon: 'badge' },
  { label: 'Classes', href: ROUTES.ADMIN_CLASSES, icon: 'meeting_room' },
  { label: 'Subjects', href: ROUTES.ADMIN_SUBJECTS, icon: 'book' },
  { label: 'Settings', href: ROUTES.ADMIN_SETTINGS, icon: 'settings' },
];

export function AdminLayout() {
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!user || !isAdmin(user.role)) {
    return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
  }

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
              <img src="/genesis-icon.jpg" alt="Genesis" className="h-9 w-9 rounded-xl object-cover" />
              <span className="text-title-sm">Genesis</span>
            </div>
          )}
          {sidebarCollapsed && (
            <img src="/genesis-icon.jpg" alt="Genesis" className="h-9 w-9 rounded-xl object-cover" />
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
                  <p className="text-label-sm text-on-surface-variant capitalize">
                    {user.role.replace(/_/g, ' ')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
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
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} aria-label="Search">
              <Icon name="search" size={20} />
            </Button>
            {user && <NotificationDropdown />}
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
      <GlobalSearchDialog isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
