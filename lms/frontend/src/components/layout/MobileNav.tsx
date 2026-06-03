import { NavLink } from 'react-router-dom';
import { BookOpen, ClipboardList, Home, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';

const navItems = [
  { label: 'Home', href: ROUTES.DASHBOARD, icon: Home },
  { label: 'Courses', href: ROUTES.COURSES, icon: BookOpen },
  { label: 'Assignments', href: ROUTES.ASSIGNMENTS, icon: ClipboardList },
  { label: 'Messages', href: ROUTES.MESSAGES, icon: MessageSquare },
  { label: 'Profile', href: ROUTES.PROFILE, icon: User },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background lg:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
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
            <item.icon className="h-5 w-5" aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
