import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, CheckCircle, Clock, GraduationCap, MessageCircle,
  TrendingUp, Trophy, Sparkles, ArrowRight, Play, AlertCircle,
  FileText, BookMarked, Search, Calendar
} from 'lucide-react';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn, formatDate, getTimeGreeting } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

function getDueBadge(date: string) {
  const d = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = due.getTime() - today.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: 'Overdue', variant: 'destructive' as const };
  if (days === 0) return { label: 'Due Today', variant: 'warning' as const };
  if (days === 1) return { label: 'Due Tomorrow', variant: 'secondary' as const };
  return { label: formatDate(date), variant: 'outline' as const };
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function DashboardSkeleton() {
  return (
    <div className="p-4 space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}

function EmptyState({ name }: { name: string }) {
  return (
    <Card className="col-span-full">
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <p className="text-lg font-medium">Welcome, {name}!</p>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          You're all set to start learning. Browse courses to get started on your educational journey.
        </p>
        <Button asChild><Link to="/student/courses"><BookOpen className="h-4 w-4 mr-2" />Browse Courses</Link></Button>
      </CardContent>
    </Card>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="col-span-full">
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-lg font-medium">Something went wrong</p>
        <p className="text-sm text-muted-foreground">Failed to load dashboard data</p>
        <Button variant="outline" onClick={onRetry}>Try Again</Button>
      </CardContent>
    </Card>
  );
}

export default function StudentDashboardPage() {
  const [selectedTab, setSelectedTab] = useState('all');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: async () => {
      await new Promise(r => setTimeout(r, 1000));
      return null;
    },
  });

  const isNewUser = false;
  const userName = 'Alex';

  if (isLoading) return <DashboardSkeleton />;
  if (isError) return <div className="p-4"><ErrorState onRetry={() => refetch()} /></div>;
  if (isNewUser) return <div className="p-4"><EmptyState name={userName} /></div>;

  const courses = [
    { id: '1', title: 'Algebra II', teacher: 'Mrs. Johnson', progress: 65, color: 'from-violet-500 to-purple-600' },
    { id: '2', title: 'World History', teacher: 'Mr. Chen', progress: 30, color: 'from-blue-500 to-cyan-600' },
    { id: '3', title: 'Biology 101', teacher: 'Dr. Patel', progress: 80, color: 'from-emerald-500 to-teal-600' },
  ];

  const lessons = [
    { id: '1', title: 'Quadratic Equations', course: 'Algebra II', time: '9:00 AM', live: true },
    { id: '2', title: 'World War II Overview', course: 'World History', time: '10:30 AM', live: false },
    { id: '3', title: 'Cell Division', course: 'Biology 101', time: '1:00 PM', live: false },
  ];

  const assignments = [
    { id: '1', title: 'Homework Set 5', course: 'Algebra II', due: new Date(Date.now() + 86400000).toISOString(), points: 50 },
    { id: '2', title: 'History Essay', course: 'World History', due: new Date(Date.now() - 86400000).toISOString(), points: 100 },
    { id: '3', title: 'Lab Report', course: 'Biology 101', due: new Date(Date.now() + 2 * 86400000).toISOString(), points: 75 },
  ];

  const grades = [
    { course: 'Algebra II', grade: 'A-', score: 90, color: 'text-emerald-500' },
    { course: 'World History', grade: 'B+', score: 87, color: 'text-emerald-500' },
    { course: 'Biology 101', grade: 'C+', score: 78, color: 'text-amber-500' },
  ];

  const announcements = [
    { id: '1', title: 'Final Exam Schedule', body: 'The final exam schedule has been posted.', time: new Date(Date.now() - 3600000).toISOString() },
    { id: '2', title: 'School Assembly', body: 'Friday assembly at 2 PM in the auditorium.', time: new Date(Date.now() - 86400000 * 2).toISOString() },
  ];

  const activities = [
    { id: '1', type: 'completed', desc: 'Completed "Quadratic Equations"', time: '2h ago' },
    { id: '2', type: 'grade', desc: 'Grade posted: Algebra Quiz - 92%', time: '5h ago' },
    { id: '3', type: 'submitted', desc: 'Submitted History Essay', time: '1d ago' },
  ];

  return (
    <>
      <SEOHead title="Dashboard" description="Your learning dashboard" canonical="/dashboard/student" />
      <motion.div variants={container} initial="hidden" animate="show" className="p-4 max-w-5xl mx-auto space-y-6 pb-20">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold">{getTimeGreeting()}, {userName}</h1>
        <p className="text-sm text-muted-foreground">Here's your learning summary</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><BookOpen className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{courses.length}</p><p className="text-xs text-muted-foreground">Active Courses</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-emerald-500" /></div><div><p className="text-2xl font-bold">12</p><p className="text-xs text-muted-foreground">Completed</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><Clock className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">3</p><p className="text-xs text-muted-foreground">Pending</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center"><Trophy className="h-5 w-5 text-violet-500" /></div><div><p className="text-2xl font-bold">88%</p><p className="text-xs text-muted-foreground">Avg Grade</p></div></CardContent></Card>
      </motion.div>

      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Continue Learning</h2>
          <Link to="/student/courses" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          {courses.map(c => (
            <Link key={c.id} to={`/student/courses/${c.id}`} className="flex-shrink-0 w-64">
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <div className={`h-24 bg-gradient-to-br ${c.color} flex items-end p-3`}>
                  <p className="text-white font-semibold text-sm">{c.title}</p>
                </div>
                <CardContent className="p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">{c.teacher}</p>
                  <div className="flex items-center gap-2">
                    <Progress value={c.progress} className="flex-1 h-1.5" />
                    <span className="text-xs font-medium">{c.progress}%</span>
                  </div>
                  <Button size="sm" variant="secondary" className="w-full text-xs">
                    <Play className="h-3 w-3 mr-1" />Continue
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Today's Lessons</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {lessons.map(l => (
                <div key={l.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
                  <div className={cn('h-2 w-2 rounded-full', l.live ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{l.title}</p>
                    <p className="text-xs text-muted-foreground">{l.course}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{l.time}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Upcoming Assignments</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {assignments.map(a => {
                const badge = getDueBadge(a.due);
                return (
                  <Link key={a.id} to={`/student/assignments/${a.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.course} &middot; {a.points} pts</p>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      </div>

        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Recent Grades</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {grades.map(g => (
                <div key={g.course} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                  <span className="text-sm font-medium">{g.course}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={g.score} className="w-24 h-1.5" />
                    <span className={cn('text-sm font-bold', g.color)}>{g.grade}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div variants={item}><Card><CardHeader className="pb-2"><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {activities.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-2">
                  <div className={cn('h-2 w-2 rounded-full', a.type === 'completed' ? 'bg-emerald-500' : a.type === 'grade' ? 'bg-primary' : 'bg-amber-500')} />
                  <div className="flex-1"><p className="text-sm">{a.desc}</p></div>
                  <span className="text-xs text-muted-foreground">{a.time}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Announcements</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {announcements.map(a => (
                <div key={a.id} className="p-2 rounded-lg hover:bg-accent transition-colors">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(a.time)}</p>
                </div>
              ))}
            </CardContent>
          </Card></motion.div>
      </div>

      <motion.div variants={item}><Card><CardHeader className="pb-2"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="justify-start h-auto py-3" asChild><Link to="/student/courses"><BookOpen className="h-4 w-4 mr-2" />Browse Courses</Link></Button>
            <Button variant="outline" className="justify-start h-auto py-3" asChild><Link to="/student/messages"><MessageCircle className="h-4 w-4 mr-2" />Messages</Link></Button>
            <Button variant="outline" className="justify-start h-auto py-3" asChild><Link to="/student/grades"><TrendingUp className="h-4 w-4 mr-2" />Grades</Link></Button>
            <Button variant="outline" className="justify-start h-auto py-3" asChild><Link to="/student/courses"><Play className="h-4 w-4 mr-2" />Start Learning</Link></Button>
          </CardContent>
        </Card>
      </motion.div>
      </motion.div>
      </>
  );
}
