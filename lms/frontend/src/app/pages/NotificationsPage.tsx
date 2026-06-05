import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import { mockNotifications } from '@/lib/mockData';
import { ROUTES } from '@/lib/constants';
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

  const items = useMemo(
    () => (user ? mockNotifications.filter((n) => n.recipientId === user.id) : []),
    [user],
  );

  const displayed = filter === 'unread' ? items.filter((n) => !n.read) : items;

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
                <CardContent className="p-12 text-center">
                  <Icon name="notifications_off" size={48} className="text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No notifications</p>
                </CardContent>
              </Card>
            ) : (
              <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-2">
                {displayed.map((n) => (
                  <motion.div key={n.id} variants={listItem}>
                    <Link to={n.link || '#'} className="block">
                      <Card className={cn('hover:shadow-md transition-shadow', !n.read && 'border-l-2 border-l-primary')}>
                        <CardContent className="p-4 flex items-start gap-3">
                          <div className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', n.read ? 'bg-transparent' : 'bg-primary')} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn('text-sm', !n.read && 'font-semibold')}>{n.title}</span>
                              <Badge variant="outline" className="text-[10px] capitalize">{n.type}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">{relativeTime(n.createdAt)}</p>
                          </div>
                          <Icon name="chevron_right" size={16} className="text-muted-foreground/40 mt-2" />
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
