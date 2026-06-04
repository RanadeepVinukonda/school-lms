import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  GraduationCap,
  FileQuestion,
  MessageSquare,
  Users,
  School,
  BookMarked,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { ROUTES, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '@/lib/constants';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: <LayoutDashboard className="h-5 w-5" aria-hidden="true" />, roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'] },
      { label: 'Courses', href: ROUTES.COURSES, icon: <BookOpen className="h-5 w-5" aria-hidden="true" />, roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'] },
      { label: 'Assignments', href: ROUTES.ASSIGNMENTS, icon: <ClipboardList className="h-5 w-5" aria-hidden="true" />, roles: ['super_admin', 'admin', 'teacher', 'student'] },
      { label: 'Quizzes', href: ROUTES.QUIZZES, icon: <FileQuestion className="h-5 w-5" aria-hidden="true" />, roles: ['super_admin', 'admin', 'teacher', 'student'] },
      { label: 'Exams', href: ROUTES.EXAMS, icon: <GraduationCap className="h-5 w-5" aria-hidden="true" />, roles: ['super_admin', 'admin', 'teacher', 'student'] },
    ],
  },
  {
    title: 'Communication',
    items: [
      { label: 'Messages', href: ROUTES.MESSAGES, icon: <MessageSquare className="h-5 w-5" aria-hidden="true" />, roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'] },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Grades', href: ROUTES.GRADES, icon: <BookMarked className="h-5 w-5" aria-hidden="true" />, roles: ['super_admin', 'admin', 'teacher', 'student', 'parent'] },
      { label: 'Users', href: ROUTES.USERS, icon: <Users className="h-5 w-5" aria-hidden="true" />, roles: ['super_admin', 'admin'] },
      { label: 'Classes', href: ROUTES.CLASSES, icon: <School className="h-5 w-5" aria-hidden="true" />, roles: ['super_admin', 'admin', 'teacher'] },
      { label: 'Subjects', href: ROUTES.SUBJECTS, icon: <BookMarked className="h-5 w-5" aria-hidden="true" />, roles: ['super_admin', 'admin', 'teacher'] },
      { label: 'Analytics', href: ROUTES.ANALYTICS, icon: <BarChart3 className="h-5 w-5" aria-hidden="true" />, roles: ['super_admin', 'admin', 'teacher'] },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', href: ROUTES.SETTINGS, icon: <Settings className="h-5 w-5" aria-hidden="true" />, roles: ['super_admin', 'admin', 'teacher', 'student'] },
    ],
  },
];

export function Sidebar() {
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen, setSidebarCollapsed } = useUIStore();
  const user = useAuthStore((s) => s.user);

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full border-r bg-card transition-all duration-300 ease-in-out flex flex-col',
          sidebarCollapsed ? 'w-[72px]' : 'w-[280px]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className={cn(
          'flex items-center h-16 border-b px-4',
          sidebarCollapsed ? 'justify-center' : 'justify-between',
        )}>
          {!sidebarCollapsed && (
            <Link to="/dashboard" className="flex items-center gap-2 font-bold text-xl">
              <GraduationCap className="h-6 w-6 text-primary" />
              <span>Genesis</span>
            </Link>
          )}
          {sidebarCollapsed && (
            <Link to="/dashboard">
              <GraduationCap className="h-6 w-6 text-primary" />
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              {!sidebarCollapsed && (
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items
                  .filter((item) => user && item.roles.includes(user.role))
                  .map((item) => (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          isActive
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground',
                          sidebarCollapsed && 'justify-center px-2',
                        )
                      }
                    >
                      {item.icon}
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </NavLink>
                  ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
