import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { SearchInput } from '@/components/common/SearchInput';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { UserAvatar } from './UserAvatar';
import { cn } from '@/lib/utils';
import { HEADER_HEIGHT } from '@/lib/constants';

interface HeaderProps {
  onSearch?: (query: string) => void;
  className?: string;
}

export function Header({ onSearch, className }: HeaderProps) {
  const { toggleSidebar } = useUIStore();
  const user = useAuthStore((s) => s.user);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex items-center h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6 gap-4',
        className,
      )}
    >
      <Button variant="ghost" size="icon" onClick={toggleSidebar} className="lg:hidden">
        <Menu className="h-5 w-5" />
      </Button>

      {onSearch && (
        <SearchInput
          value=""
          onChange={onSearch}
          placeholder="Search courses, assignments..."
          className="hidden sm:block max-w-md flex-1"
        />
      )}

      <div className="flex items-center gap-2 ml-auto">
        <ThemeToggle />
        {user && <NotificationBell />}
        {user && <UserAvatar />}
      </div>
    </header>
  );
}
