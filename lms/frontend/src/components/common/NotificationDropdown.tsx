import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellOff, CheckCheck, Star, FileText, HelpCircle,
  MessageSquare, Calendar, Info, AlertTriangle, ChevronRight,
  MessageCircle, Siren,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { toast } from 'sonner';
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useRealtimeInvalidation } from '@/lib/useRealtimeInvalidation';
import { markNotificationRead, markAllNotificationsRead } from '@/services/dataService';
import { supabase } from '@/supabase/config';

type Priority = 'urgent' | 'high' | 'medium' | 'low';
interface Item { id: string; type: string; title: string; message: string; body?: string; link?: string; read: boolean; createdAt: string; priority: Priority }

const P_ORDER: Priority[] = ['urgent', 'high', 'medium', 'low'];
const P_CFG: Record<Priority, { border: string; title: string; text: string; label: string }> = {
  urgent:  { border: 'border-l-2 border-l-destructive', title: 'font-semibold',     text: '',                    label: 'Urgent' },
  high:    { border: 'border-l-2 border-l-warning',    title: 'font-medium',        text: '',                    label: 'High Priority' },
  medium:  { border: 'border-l-2 border-l-primary',    title: '',                   text: '',                    label: 'General' },
  low:     { border: '',                                title: '',                   text: 'text-muted-foreground', label: 'Updates' },
};
const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  grade: Star, assignment: FileText, exam: HelpCircle, message: MessageSquare,
  schedule: Calendar, system: Info, warning: AlertTriangle,
  quiz: HelpCircle, attendance: Calendar, submission: FileText,
  report: Siren, welcome: Bell, quiz_created: HelpCircle, quiz_published: HelpCircle,
  assignment_created: FileText, exam_created: HelpCircle, result_published: Star,
  attendance_marked: Calendar, attendance_alert: AlertTriangle, submission_graded: Star,
  regrade_requested: MessageCircle, timetable_updated: Calendar, new_registration: Info,
  parent_registration: Info, system_alert: AlertTriangle, performance_report: Star,
  teacher_message: MessageSquare,
  announcement: Info, notice: Info, re_teach: AlertTriangle, fee_reminder: Calendar,
  content_published: FileText, test_published: HelpCircle, test_submitted: FileText,
  registration: Info,
};

const DEEP_LINKS: Record<string, (role: string) => string> = {
  quiz: (r) => r === 'teacher' ? '/teacher/assessments' : '/student/assessments',
  exam: (r) => r === 'teacher' ? '/teacher/exams' : '/student/assessments',
  attendance: (r) => r === 'teacher' ? '/teacher/attendance' : '/student/dashboard',
  report: () => '/admin/reports',
  result: (r) => r === 'student' ? '/student/dashboard' : '/parent/reports',
  submission: (r) => r === 'teacher' ? '/teacher/students' : '/student/assessments',
  grade: (r) => r === 'student' ? '/student/dashboard' : '/parent/reports',
};

function derivePriority(type: string): Priority {
  if (type === 'exam' || type === 're_teach') return 'urgent';
  if (type === 'grade' || type === 'warning' || type === 'fee_reminder') return 'high';
  if (type === 'assignment' || type === 'message' || type === 'schedule' || type === 'announcement' || type === 'notice') return 'medium';
  return 'low';
}

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

const ITEMS_PER_PAGE = 20;

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { unreadCount, decrementUnread, resetUnread } = useNotificationStore();
  const queryClient = useQueryClient();

  const {
    data: infiniteData,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['notifications-dropdown-infinite', user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error: err } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + ITEMS_PER_PAGE - 1);
      if (err) throw err;
      return { data: data || [], nextOffset: pageParam + ITEMS_PER_PAGE };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.data.length < ITEMS_PER_PAGE) return undefined;
      return lastPage.nextOffset;
    },
    enabled: !!user && open,
  });

  useRealtimeInvalidation([{
    table: 'notifications',
    queryKey: ['notifications-dropdown-infinite', user?.id ?? ''],
    filter: user ? { column: 'user_id', value: user.id } : undefined,
  }]);

  const rawItems = useMemo(
    () => infiniteData?.pages.flatMap((p) => p.data) ?? [],
    [infiniteData],
  );

  const items: Item[] = useMemo(
    () => rawItems.map((n) => ({ ...n, createdAt: n.created_at, message: n.message ?? n.body ?? n.title, priority: derivePriority(n.type) })),
    [rawItems],
  );
  const unreadItems = useMemo(() => items.filter((n) => !n.read), [items]);

  useEffect(() => {
    if (!scrollRef.current || !loaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const grouped = useMemo(() => {
    const map = new Map<Priority, Item[]>();
    P_ORDER.forEach((p) => map.set(p, []));
    items.forEach((i) => map.get(i.priority)?.push(i));
    return map;
  }, [items]);

  const flatItems = useMemo(() => P_ORDER.flatMap((p) => grouped.get(p) ?? []), [grouped]);

  const resolveLink = useCallback((item: Item): string => {
    if (item.link) return item.link;
    const resolver = DEEP_LINKS[item.type];
    if (resolver && user) return resolver(user.role);
    return '#';
  }, [user]);

  const handleSelect = useCallback(async (item: Item) => {
    if (!item.read) {
      try {
        await markNotificationRead(item.id);
      } catch {
        toast.error('Failed to mark notification as read');
        return;
      }
      decrementUnread();
      queryClient.invalidateQueries({ queryKey: ['notifications-dropdown-infinite', user?.id] });
    }
    const link = resolveLink(item);
    if (link && link !== '#') {
      navigate(link);
    }
    setOpen(false);
  }, [decrementUnread, queryClient, user?.id, resolveLink, navigate]);

  const handleMarkAllRead = useCallback(async () => {
    if (!user) return;
    try {
      await markAllNotificationsRead(user.id);
    } catch {
      toast.error('Failed to mark all notifications as read');
      return;
    }
    resetUnread();
    queryClient.invalidateQueries({ queryKey: ['notifications-dropdown-infinite', user?.id] });
    toast.success('All notifications marked as read');
  }, [resetUnread, queryClient, user]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) return;
    switch (e.key) {
      case 'ArrowDown':  e.preventDefault(); setActiveIndex((p) => (p < flatItems.length - 1 ? p + 1 : 0)); break;
      case 'ArrowUp':    e.preventDefault(); setActiveIndex((p) => (p > 0 ? p - 1 : flatItems.length - 1)); break;
      case 'Enter': case ' ':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < flatItems.length) { handleSelect(flatItems[activeIndex]); setOpen(false); }
        break;
      case 'Escape': setOpen(false); break;
    }
  }, [open, flatItems, activeIndex, handleSelect]);

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    listRef.current.querySelectorAll<HTMLButtonElement>('button')[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  useEffect(() => { setActiveIndex(open && flatItems.length > 0 ? 0 : -1); }, [open, flatItems.length]);

  const renderContent = () => {
    if (error) {
      return (
        <div className="flex flex-col items-center py-10 px-4 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive/60 mb-3" />
          <p className="text-sm font-medium">Failed to load notifications</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Something went wrong. Please try again.</p>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['notifications-dropdown-infinite', user?.id] })}>Try again</Button>
        </div>
      );
    }
    if (isLoading) {
      return (
        <div className="p-3 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton shape="circular" className="h-8 w-8 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/5 rounded-md" />
                <Skeleton className="h-3 w-full rounded-md" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center py-10 px-4 text-center">
          <BellOff className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">No notifications yet</p>
          <p className="text-xs text-muted-foreground mt-1">We&apos;ll let you know when something arrives</p>
        </div>
      );
    }

    return (
      <>
        {P_ORDER.map((priority) => {
          const group = grouped.get(priority);
          if (!group || group.length === 0) return null;
          return (
            <div key={priority}>
              {priority !== 'medium' && (
                <div className="px-4 py-1.5 bg-muted/30">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{P_CFG[priority].label}</span>
                </div>
              )}
              {group.map((item) => {
                const c = P_CFG[item.priority];
                const IconComp = TYPE_ICONS[item.type] ?? Bell;
                const flatIdx = flatItems.indexOf(item);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={cn(
                      'w-full text-left flex items-start gap-3 px-4 py-3 border-b last:border-b-0 transition-colors cursor-pointer', c.border,
                      flatIdx === activeIndex && 'bg-muted/60',
                      flatIdx !== activeIndex && 'hover:bg-muted/30',
                      !item.read && 'bg-primary/[0.04] dark:bg-primary/[0.06]',
                    )}
                  >
                    <span className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0 transition-colors', item.read ? 'bg-transparent' : 'bg-primary')} />
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <IconComp className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm truncate', !item.read && 'font-semibold', c.title, c.text)}>{item.title}</p>
                      <p className={cn('text-xs text-muted-foreground line-clamp-2 mt-0.5', c.text)}>{item.message}</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">{relativeTime(item.createdAt)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
        {isFetchingNextPage && (
          <div className="p-3 flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        )}
        <div ref={loaderRef} className="h-1" />
      </>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative overflow-visible" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}>
          <Bell className="h-5 w-5" />
          <span className={cn(
            'absolute -top-2 -right-2 flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold shadow-sm ring-[3px] ring-background leading-none',
            unreadCount > 0 ? 'bg-destructive text-destructive-foreground' : 'bg-muted-foreground/20 text-muted-foreground',
          )}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-96 max-w-[90vw] p-0 max-h-[480px]" onKeyDown={handleKeyDown}>
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadItems.length > 0 && (
            <button onClick={handleMarkAllRead} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all as read
            </button>
          )}
        </div>
        <Separator />
        <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: 380 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={isLoading ? 'loading' : items.length === 0 ? 'empty' : 'content'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
        <Separator />
        <div className="p-2">
          <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
            <Link to={ROUTES.NOTIFICATIONS} onClick={() => setOpen(false)}>
              View all notifications
              <ChevronRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
