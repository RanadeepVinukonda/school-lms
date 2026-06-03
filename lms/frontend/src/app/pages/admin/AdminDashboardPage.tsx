import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Users, BookOpen, GraduationCap, TrendingUp, Activity,
  BarChart3, AlertCircle, ArrowRight, UserPlus, Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function AdminSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

export default function AdminDashboardPage() {
  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => { await new Promise(r => setTimeout(r, 600)); return null; },
  });

  if (isLoading) return <AdminSkeleton />;

  if (isError) {
    return (
      <>
        <SEOHead title="Admin Dashboard" description="System administration dashboard" canonical="/dashboard/admin" />
        <div className="p-4">
          <Card><CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="font-medium">Failed to load dashboard</p>
            <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
          </CardContent></Card>
        </div>
      </>
    );
  }

  const kpis = [
    { icon: Users, label: 'Total Users', value: '1,284', change: '+12%', color: 'text-primary', bg: 'bg-primary/10' },
    { icon: BookOpen, label: 'Total Courses', value: '68', change: '+4%', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { icon: GraduationCap, label: 'Active Students', value: '892', change: '+8%', color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { icon: TrendingUp, label: 'Teachers', value: '45', change: '+2%', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  const recentActivity = [
    { id: '1', action: 'New user registered', detail: 'Sarah K. (Student)', time: '5m ago' },
    { id: '2', action: 'Course published', detail: 'Calculus Preview by Mrs. Johnson', time: '1h ago' },
    { id: '3', action: 'System backup', detail: 'Daily backup completed', time: '3h ago' },
    { id: '4', action: 'User role changed', detail: 'James W. promoted to Teacher', time: '1d ago' },
  ];

  return (
    <>
      <SEOHead title="Admin Dashboard" description="System administration dashboard" canonical="/dashboard/admin" />
      <motion.div variants={container} initial="hidden" animate="show" className="p-4 max-w-5xl mx-auto pb-20">
        <motion.div variants={item}>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mb-4">System overview and management</p>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-2 gap-3 mb-6">
          {kpis.map(k => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', k.bg)}>
                    <k.icon className={cn('h-5 w-5', k.color)} />
                  </div>
                  <Badge variant="success" className="text-[10px]">{k.change}</Badge>
                </div>
                <p className="text-2xl font-bold">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div variants={item}>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {recentActivity.map(a => (
                  <div key={a.id} className="flex items-start gap-3 p-2 rounded-lg">
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{a.action}</p>
                      <p className="text-xs text-muted-foreground">{a.detail}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{a.time}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Quick Links</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/users"><Users className="h-4 w-4 mr-2" />User Management</Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/classes"><BookOpen className="h-4 w-4 mr-2" />Class Management</Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/subjects"><BarChart3 className="h-4 w-4 mr-2" />Subject Management</Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/settings"><Settings className="h-4 w-4 mr-2" />System Settings</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}
