import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { listContainer, listItem } from '@/lib/motion';
import { mockUsers, mockClasses, mockSubjects, mockNotifications } from '@/lib/mockData';

interface KpiItem {
  icon: string;
  label: string;
  value: string;
  change: string;
  color: string;
  bg: string;
}

const kpis: KpiItem[] = [
  { icon: 'school', label: 'Total Students', value: '3', change: '+3', color: 'text-primary', bg: 'bg-primary/10' },
  { icon: 'badge', label: 'Total Teachers', value: '2', change: '+2', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { icon: 'class', label: 'Total Classes', value: '2', change: '+2', color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { icon: 'menu_book', label: 'Total Subjects', value: '4', change: '+4', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { icon: 'trending_up', label: 'Avg Performance', value: '76%', change: '+5%', color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { icon: 'group', label: 'Active Users', value: '5', change: '100%', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
];

const quickLinks = [
  { icon: 'person', label: 'Manage Students', href: '/admin/students', color: 'text-blue-500' },
  { icon: 'badge', label: 'Manage Teachers', href: '/admin/teachers', color: 'text-emerald-500' },
  { icon: 'class', label: 'Manage Classes', href: '/admin/classes', color: 'text-violet-500' },
  { icon: 'menu_book', label: 'Manage Subjects', href: '/admin/subjects', color: 'text-amber-500' },
];

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-56 rounded-xl" />
    </div>
  );
}

export default function AdminDashboardPage() {
  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 500));
      return null;
    },
  });

  if (isLoading) return <DashboardSkeleton />;

  if (isError) {
    return (
      <>
        <SEOHead title="Admin Dashboard" description="System administration overview" canonical="/admin/dashboard" />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="rounded-full bg-destructive/10 p-4">
              <Icon name="error" size={32} className="text-destructive" />
            </div>
            <p className="font-medium">Failed to load dashboard</p>
            <Button variant="outline" onClick={() => refetch()}>
              <Icon name="refresh" size={16} className="mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  const students = Object.values(mockUsers).filter((u) => u.role === 'student');
  const teachers = Object.values(mockUsers).filter((u) => u.role === 'teacher');
  const recentActivity = mockNotifications
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <>
      <SEOHead title="Admin Dashboard" description="System administration overview" canonical="/admin/dashboard" />
      <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={listItem}>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            System overview — {students.length} students, {teachers.length} teachers, {mockClasses.length} classes
          </p>
        </motion.div>

        <motion.div
          variants={listItem}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {kpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center', kpi.bg)}>
                    <Icon name={kpi.icon} size={22} className={kpi.color} />
                  </div>
                  <Badge variant={kpi.change.startsWith('+') ? 'success' : 'warning'} className="text-[10px]">
                    {kpi.change}
                  </Badge>
                </div>
                <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={listItem}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon name="notifications" size={18} className="text-muted-foreground" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {recentActivity.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-muted-foreground">
                    <Icon name="notifications_none" size={36} />
                    <p className="text-sm mt-2">No recent activity</p>
                  </div>
                ) : (
                  recentActivity.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.message}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                        {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={listItem}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon name="quickreply" size={18} className="text-muted-foreground" />
                  Quick Links
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quickLinks.map((link) => (
                  <Button
                    key={link.href}
                    variant="outline"
                    className="w-full justify-start gap-3 h-11"
                    asChild
                  >
                    <Link to={link.href}>
                      <Icon name={link.icon} size={18} className={link.color} />
                      <span>{link.label}</span>
                      <Icon name="chevron_right" size={16} className="ml-auto text-muted-foreground" />
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}
