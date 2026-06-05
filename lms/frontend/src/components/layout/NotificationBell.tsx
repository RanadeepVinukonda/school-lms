import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { mockNotifications } from '@/lib/mockData';

const empty: never[] = [];

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? '';
  const items = userId ? mockNotifications.filter((n) => n.recipientId === userId) : empty;
  const unreadItems = items.filter((n) => !n.read);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadItems.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-sm ring-2 ring-background">
              {unreadItems.length > 99 ? '99+' : unreadItems.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            items.slice(0, 10).map((notification) => (
              <Link
                key={notification.id}
                to={notification.link || '#'}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-start gap-3 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors',
                  !notification.read && 'bg-muted/30',
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm', !notification.read && 'font-medium')}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {notification.message}
                  </p>
                </div>
                {!notification.read && (
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
              </Link>
            ))
          )}
        </div>
        <div className="p-2 border-t">
          <Button variant="ghost" size="sm" className="w-full text-xs" disabled>
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
