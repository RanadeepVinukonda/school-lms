import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Bell, AlertCircle, CheckCheck, GraduationCap,
  MessageCircle, FileText, Star, Award
} from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDate } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'announcement' | 'grade' | 'assignment' | 'message' | 'system';
  read: boolean;
  createdAt: Date;
}

const notifications: Notification[] = [
  { id: 'n1', title: 'Grade Posted', body: 'Your Algebra II quiz score is now available.', type: 'grade', read: false, createdAt: new Date(Date.now() - 3600000) },
  { id: 'n2', title: 'New Assignment', body: 'Homework Set 6 has been posted in Algebra II.', type: 'assignment', read: false, createdAt: new Date(Date.now() - 7200000) },
  { id: 'n3', title: 'New Message', body: 'Mrs. Johnson sent you a message.', type: 'message', read: true, createdAt: new Date(Date.now() - 86400000) },
  { id: 'n4', title: 'School Announcement', body: 'Parent-teacher conferences are next week.', type: 'announcement', read: true, createdAt: new Date(Date.now() - 172800000) },
  { id: 'n5', title: 'Achievement Unlocked', body: 'You completed 5 assignments in a row!', type: 'system', read: true, createdAt: new Date(Date.now() - 259200000) },
];

const notificationIcons = {
  announcement: Star,
  grade: Award,
  assignment: FileText,
  message: MessageCircle,
  system: GraduationCap,
};

function groupByDate(notifs: Notification[]): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {};
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);

  notifs.forEach(n => {
    const d = new Date(n.createdAt);
    let key: string;
    if (d.toDateString() === today.toDateString()) key = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) key = 'Yesterday';
    else if (d.getTime() > today.getTime() - 7 * 86400000) key = 'This Week';
    else key = 'Earlier';
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  });
  return groups;
}

export default function NotificationsPage() {
  const [allRead, setAllRead] = useState(false);

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => { await new Promise(r => setTimeout(r, 500)); return null; },
  });

  const grouped = groupByDate(notifications);
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setAllRead(true);
    toast.success('All notifications marked as read');
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-40" />
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium">Failed to load notifications</p>
          <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
        </CardContent></Card>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <Bell className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No notifications</p>
          <p className="text-sm text-muted-foreground">You're all caught up!</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead title="Notifications" description="Your notifications" canonical="/notifications" />
      <div className="p-4 max-w-3xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-1" />Mark All Read
          </Button>
        )}
      </div>

      {Object.entries(grouped).map(([dateLabel, items]) => (
        <div key={dateLabel} className="mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{dateLabel}</p>
          <div className="space-y-1">
            {items.map(n => {
              const Icon = notificationIcons[n.type];
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl transition-colors',
                    !n.read && !allRead ? 'bg-primary/5 border border-primary/10' : 'hover:bg-accent',
                  )}
                >
                  <div className={cn(
                    'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0',
                    !n.read && !allRead ? 'bg-primary/10' : 'bg-muted',
                  )}>
                    <Icon className={cn('h-4 w-4', !n.read && !allRead ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={cn('text-sm', !n.read && !allRead ? 'font-semibold' : 'font-medium')}>{n.title}</p>
                      {!n.read && !allRead && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
    </>
  );
}

