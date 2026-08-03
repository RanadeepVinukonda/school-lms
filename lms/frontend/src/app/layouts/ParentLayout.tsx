import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/supabase/config';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import NotificationDropdown from '@/components/common/NotificationDropdown';
import { TutorialGuide } from '@/components/common/TutorialGuide';
import { useNotificationStore } from '@/store/notificationStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { UserAvatar } from '@/components/layout/UserAvatar';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { pageTransition } from '@/lib/motion';
import { useTranslation } from '@/hooks/useTranslation';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { label: 'Home', href: ROUTES.PARENT_DASHBOARD, icon: 'home' },
      { label: 'My Children', href: ROUTES.PARENT_CHILDREN, icon: 'family_restroom' },
      { label: 'Reports', href: ROUTES.PARENT_REPORTS, icon: 'assessment' },
      { label: 'Notice Board', href: ROUTES.PARENT_NOTICEBOARD, icon: 'campaign' },
      { label: 'Report & Suggestion', href: ROUTES.PARENT_REPORT, icon: 'feedback' },
    ],
  },
];

const mobileNavItems: NavItem[] = [
  { label: 'Home', href: ROUTES.PARENT_DASHBOARD, icon: 'home' },
  { label: 'Children', href: ROUTES.PARENT_CHILDREN, icon: 'family_restroom' },
  { label: 'Reports', href: ROUTES.PARENT_REPORTS, icon: 'assessment' },
  { label: 'Notice Board', href: ROUTES.PARENT_NOTICEBOARD, icon: 'campaign' },
  { label: 'Report & Suggestion', href: ROUTES.PARENT_REPORT, icon: 'feedback' },
];

export default function ParentLayout() {
  const user = useAuthStore((s) => s.user);
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const { t } = useTranslation();
  const subscribeToNotifications = useNotificationStore((s) => s.subscribeToNotifications);
  usePushNotifications(!!user);
  const getLabel = (label: string) => {
    const key = `nav.${label.toLowerCase().replace(/ /g, '')}`;
    const val = t(key as any);
    return val === key ? label : val;
  };

  useEffect(() => {
    if (!user) return;
    supabase.from('users').select('tutorial_seen').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (data && data.tutorial_seen === false) {
        setTutorialOpen(true);
      }
    }, () => toast.error('Failed to check tutorial status'));
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeToNotifications(user.id);
    return unsub;
  }, [user?.id, subscribeToNotifications]);

  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
        Skip to content
      </a>
      <aside
        className={cn(
          'hidden lg:flex fixed top-0 left-0 z-50 h-full border-r border-outline-variant bg-surface transition-all duration-300 ease-in-out flex-col',
          sidebarCollapsed ? 'w-20' : 'w-64',
        )}
      >
        <div
          className={cn(
            'flex items-center border-b border-outline-variant shrink-0',
            sidebarCollapsed ? 'h-16 justify-center' : 'h-28 flex-col justify-center px-6',
          )}
        >
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-1">
              <img src="/genesis_icon.png" alt="Genesis" className="h-8 w-8 object-contain" />
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                className="text-on-surface-variant hover:text-primary transition-colors"
                aria-label="Expand sidebar"
              >
                <Icon name="chevron_right" size={16} />
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src="/genesis_icon.png"
                  alt="Genesis"
                  className="h-14 w-auto object-contain"
                />
                <div>
                  <p className="text-label-lg font-bold text-primary">Genesis</p>
                  <p className="text-label-sm text-on-surface-variant tracking-wider">LMS</p>
                </div>
              </div>
              <Button
                variant="text"
                size="icon-sm"
                onClick={() => setSidebarCollapsed(true)}
                className="text-on-surface-variant"
              >
                <Icon name="chevron_left" size={18} />
              </Button>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!sidebarCollapsed && (
                <p className="text-label-xs font-semibold text-on-surface-variant uppercase tracking-wider px-3 pb-1.5">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
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
                      {!sidebarCollapsed && <span className="leading-none">{getLabel(item.label)}</span>}
                    </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

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

      <div
        className={cn(
          'transition-all duration-300 ease-in-out pb-8',
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64',
        )}
      >
        <header className="relative z-30 flex h-16 items-center gap-2 sm:gap-4 border-b border-outline-variant bg-surface px-3 sm:px-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden text-on-surface shrink-0" aria-label="Menu">
                <Icon name="menu" size={24} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="gap-0 p-0 flex flex-col h-full border-r border-outline-variant bg-surface animate-in">
              <div className="flex items-center h-16 px-5 border-b border-outline-variant shrink-0">
                <img
                  src="/genesis_icon.png"
                  alt="Genesis"
                  className="h-8 w-auto object-contain"
                />
              </div>

              <nav className="flex-1 overflow-y-auto py-2 px-2 flex flex-col gap-0.5">
                {navGroups.map((group) => (
                  <div key={group.label}>
                    <p className="text-label-xs font-semibold text-on-surface-variant uppercase tracking-wider px-3 pb-1">
                      {group.label}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {group.items.map((item) => (
                        <SheetClose asChild key={item.href}>
                          <NavLink
                            to={item.href}
                              className={({ isActive }) =>
                                cn(
                                  'flex items-center gap-3 rounded-xl w-full px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                  isActive
                                    ? 'bg-secondary-container text-on-secondary-container'
                                    : 'text-on-surface-variant hover:bg-surface-variant/50',
                                )
                              }
                            >
                              <Icon name={item.icon} size={24} />
                              <span className="leading-none">{getLabel(item.label)}</span>
                            </NavLink>
                        </SheetClose>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="border-t border-outline-variant p-4 shrink-0">
                {user && (
                  <div className="flex items-center gap-3">
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
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.displayName}</p>
                      <p className="text-label-sm text-on-surface-variant capitalize">
                        {user.role.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <span className="text-title-md font-bold text-primary hidden sm:block shrink-0">Genesis</span>
          <img src="/genesis_icon.png" alt="Genesis" className="h-9 w-9 object-contain sm:hidden shrink-0" />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {user && <NotificationDropdown />}
            {user && <UserAvatar />}
          </div>
        </header>

        <main id="main-content" className="min-h-[calc(100vh-8rem)]">
          <Outlet />
        </main>
      </div>

      <TutorialGuide open={tutorialOpen} onComplete={() => setTutorialOpen(false)} />
    </div>
  );
}
