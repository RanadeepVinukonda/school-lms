import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotificationStore } from '@/store/notificationStore';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '@/services/notificationService';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { unreadCount, setUnreadCount, resetUnread } = useNotificationStore();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getAll(),
    enabled: open,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const result = await notificationService.getUnreadCount();
      setUnreadCount(result.data?.count ?? 0);
      return result.data;
    },
    refetchInterval: 30000,
  });

  async function handleMarkAllRead() {
    try {
      await notificationService.markAllAsRead();
      resetUnread();
    } catch {
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={handleMarkAllRead}>
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !data || !data.items || data.items.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            data.items.slice(0, 10).map((notification: { id: string; title: string; body: string; link?: string; read: boolean }) => (
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
                    {notification.body}
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
          <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
            <Link to={ROUTES.NOTIFICATIONS}>View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
