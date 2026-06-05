import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import { getNotificationsByUser, markNotificationRead, markAllNotificationsRead } from '@/services/dataService';
import { cn } from '@/lib/utils';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: items = [], refetch } = useQuery({
    queryKey: ['notifications-page', user?.id],
    queryFn: () => getNotificationsByUser(user!.id),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const displayed = filter === 'unread' ? items.filter((n) => !n.read) : items;

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    refetch();
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.id);
    refetch();
  };

  return (
    <>
      <SEOHead title="Notifications" description="View all your notifications" />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-3xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><Icon name="arrow_back" size={20} /></Button>
          <h1 className="text-headline-sm font-bold">Notifications</h1>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
          <TabsList>
            <TabsTrigger value="all">All ({items.length})</TabsTrigger>
            <TabsTrigger value="unread">Unread ({items.filter((n) => !n.read).length})</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-4">
            {displayed.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-16 text-center">
                  <Icon name="notifications_none" size={48} className="text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No notifications to show.</p>
                </CardContent>
              </Card>
            ) : (
              <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-2">
                {displayed.length > 0 && filter === 'unread' && (
                  <div className="flex justify-end mb-2">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={handleMarkAllRead}>
                      <Icon name="done_all" size={14} /> Mark all as read
                    </Button>
                  </div>
                )}
                {displayed.map((n) => (
                  <motion.div key={n.id} variants={listItem}>
                    <Link to={n.link || '#'} className="block" onClick={() => { if (!n.read) handleMarkRead(n.id); }}>
                      <Card className={cn('hover:shadow-md transition-shadow', !n.read && 'border-l-2 border-l-primary')}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={cn('text-sm', !n.read && 'font-semibold')}>{n.title}</p>
                                {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                              <p className="text-xs text-muted-foreground/60 mt-1 flex items-center gap-1">
                                <Icon name="schedule" size={12} /> {relativeTime(n.createdAt)}
                              </p>
                            </div>
                            <Badge variant="outline" className="shrink-0 text-[10px] capitalize">{n.type}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </>
  );
}
