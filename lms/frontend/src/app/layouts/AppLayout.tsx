import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, LayoutGrid, BookOpen, MessageCircle, Bell,
  BarChart3, Users, Settings, GraduationCap, LogOut,
  Menu, X, ChevronLeft, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const studentNav = [
  { icon: Home, label: 'Dashboard', path: '/student/dashboard' },
  { icon: BookOpen, label: 'Subjects', path: '/student/subjects' },
  { icon: BarChart3, label: 'Grades', path: '/student/grades' },
  { icon: MessageCircle, label: 'Messages', path: '/student/messages' },
  { icon: Bell, label: 'Notifications', path: '/student/notifications' },
];

const teacherNav = [
  { icon: Home, label: 'Dashboard', path: '/teacher/dashboard' },
  { icon: BookOpen, label: 'My Courses', path: '/teacher/courses' },
  { icon: BarChart3, label: 'Gradebook', path: '/teacher/gradebook' },
  { icon: MessageCircle, label: 'Messages', path: '/student/messages' },
  { icon: Bell, label: 'Notifications', path: '/student/notifications' },
];

const adminNav = [
  { icon: Home, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: Users, label: 'Users', path: '/admin/users' },
  { icon: LayoutGrid, label: 'Classes', path: '/admin/classes' },
  { icon: BookOpen, label: 'Subjects', path: '/admin/subjects' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const role = 'student' as string;
  const nav = role === 'admin' ? adminNav : role === 'teacher' ? teacherNav : studentNav;

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Genesis</span>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <Separator />
        <nav className="p-2 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                location.pathname === item.path
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="p-4 mt-auto">
          <Link
            to="/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">User</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </Link>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hidden lg:flex">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/student/notifications">
                  <Bell className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/student/messages">
                  <MessageCircle className="h-5 w-5" />
                </Link>
              </Button>
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
