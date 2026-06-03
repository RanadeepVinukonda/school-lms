import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Users, FileText, Clock, AlertCircle, Plus,
  TrendingUp, ArrowRight, Sparkles, GraduationCap
} from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, formatDate } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function DashboardSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}

export default function TeacherDashboardPage() {
  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: async () => { await new Promise(r => setTimeout(r, 800)); return null; },
  });

  if (isLoading) return <DashboardSkeleton />;

  if (isError) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium">Failed to load dashboard</p>
          <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
        </CardContent></Card>
      </div>
    );
  }

  const stats = [
    { icon: BookOpen, label: 'Active Courses', value: '4', color: 'text-primary', bg: 'bg-primary/10' },
    { icon: Users, label: 'Total Students', value: '127', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { icon: FileText, label: 'Pending Grading', value: '23', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { icon: Clock, label: 'Upcoming Lessons', value: '5', color: 'text-violet-500', bg: 'bg-violet-500/10' },
  ];

  const pendingGrading = [
    { id: '1', student: 'Alex M.', assignment: 'Homework Set 5', course: 'Algebra II', submitted: '2h ago', type: 'assignment' },
    { id: '2', student: 'Sarah K.', assignment: 'Quiz 3', course: 'Algebra II', submitted: '5h ago', type: 'quiz' },
    { id: '3', student: 'James W.', assignment: 'History Essay', course: 'World History', submitted: '1d ago', type: 'assignment' },
  ];

  const recentActivity = [
    { id: '1', action: 'Posted homework set', course: 'Algebra II', time: '1h ago' },
    { id: '2', action: 'Graded 5 quiz submissions', course: 'Biology 101', time: '3h ago' },
    { id: '3', action: 'Added new lesson', course: 'World History', time: '1d ago' },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="p-4 max-w-5xl mx-auto pb-20">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold">Good morning, Teacher</h1>
        <p className="text-sm text-muted-foreground mb-4">Here's your classroom overview</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 gap-3 mb-6">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', s.bg)}>
                <s.icon className={cn('h-5 w-5', s.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Pending Grading</CardTitle>
              <Badge variant="warning">{pendingGrading.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingGrading.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
                  <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{p.student.split(' ').map(s => s[0]).join('')}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.student}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.assignment} &middot; {p.course}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{p.submitted}</p>
                    <Badge variant="secondary" className="text-[10px]">{p.type}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {recentActivity.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div className="flex-1">
                    <p className="text-sm">{a.action}</p>
                    <p className="text-xs text-muted-foreground">{a.course}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{a.time}</span>
                </div>
              ))}
              <Link to="#" className="flex items-center gap-1 text-sm text-primary pt-1">
                View all activity <ArrowRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="justify-start h-auto py-3" asChild>
              <Link to="/teacher/courses"><Plus className="h-4 w-4 mr-2" />Create Course</Link>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3" asChild>
              <Link to="#"><FileText className="h-4 w-4 mr-2" />Create Assignment</Link>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3" asChild>
              <Link to="/teacher/gradebook"><TrendingUp className="h-4 w-4 mr-2" />Gradebook</Link>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3" asChild>
              <Link to="/teacher/courses"><BookOpen className="h-4 w-4 mr-2" />My Courses</Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
