import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { getDueUrgency } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/format';
import { pageTransition, listContainer, listItem, springTransition } from '@/lib/motion';
import { useQuery } from '@tanstack/react-query';
import {
  mockUsers,
  mockEnrollments,
  mockNotifications,
  mockAssignments,
  mockSubjects,
  mockQuizzes,
  mockExams,
  mockGrades,
  mockTextbooks,
} from '@/lib/mockData';

function AnimatedCount({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayed(value);
        clearInterval(timer);
      } else {
        setDisplayed(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  return <>{displayed}</>;
}

function DashboardSkeleton() {
  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6 pb-20">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

function ErrorDisplay({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-4 max-w-5xl mx-auto pb-20">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Icon name="error" size={32} className="text-destructive" />
          </div>
          <p className="text-lg font-semibold">Something went wrong</p>
          <p className="text-sm text-muted-foreground">Failed to load dashboard data. Please try again.</p>
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <Icon name="refresh" size={16} />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyDashboard({ displayName }: { displayName: string }) {
  return (
    <div className="p-4 max-w-5xl mx-auto pb-20">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon name="auto_awesome" size={40} className="text-primary" />
          </div>
          <p className="text-xl font-bold">Welcome, {displayName}!</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            You are not enrolled in any subjects yet. Browse the course catalog to get started on your learning journey.
          </p>
          <Button asChild>
            <Link to="/student/subjects">
              <Icon name="menu_book" size={16} className="mr-2" />
              Browse Subjects
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StudentDashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      const student = mockUsers.student1;
      const enrollments = mockEnrollments.filter((e) => e.studentId === student.id);
      const subjectIds = enrollments.map((e) => e.subjectId);
      const enrolledSubjects = mockSubjects.filter((s) => subjectIds.includes(s.id));
      const notifications = mockNotifications.filter((n) => n.recipientId === student.id);
      const subjectTextbookIds = mockTextbooks.filter((tb) => subjectIds.includes(tb.subjectId)).map((tb) => tb.id);
      const pendingAssignments = mockAssignments.filter((a) => subjectTextbookIds.includes(a.textbookId));
      const upcomingExams = mockExams.filter((e) => new Date(e.startDate) > new Date());
      const grades = mockGrades.filter((g) => g.studentId === student.id);

      return { student, enrollments, enrolledSubjects, notifications, pendingAssignments, upcomingExams, grades };
    },
  });

  if (isLoading) return <DashboardSkeleton />;
  if (isError) return <ErrorDisplay onRetry={() => refetch()} />;
  if (!data || data.enrolledSubjects.length === 0) {
    return <EmptyDashboard displayName={mockUsers.student1.displayName} />;
  }

  const { student, enrollments, enrolledSubjects, notifications, pendingAssignments, upcomingExams, grades } = data;
  const avgGrade = grades.length > 0 ? Math.round(grades.reduce((sum, g) => sum + g.percentage, 0) / grades.length) : 0;

  return (
    <>
      <SEOHead title="Dashboard" description="Your student learning dashboard" />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 max-w-5xl mx-auto space-y-6 pb-20"
      >
        {/* Greeting */}
        <motion.div variants={listItem} initial="hidden" animate="show">
          <h1 className="text-2xl font-bold">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            {student.displayName.split(' ')[0]}
          </h1>
          <p className="text-sm text-muted-foreground">Here is your learning summary</p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          variants={listContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <motion.div variants={listItem}>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="menu_book" size={20} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold">
                    <AnimatedCount value={enrolledSubjects.length} />
                  </p>
                  <p className="text-xs text-muted-foreground truncate">Enrolled Subjects</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={listItem}>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="assignment" size={20} className="text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold">
                    <AnimatedCount value={pendingAssignments.length} />
                  </p>
                  <p className="text-xs text-muted-foreground truncate">Pending Assignments</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={listItem}>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="fact_check" size={20} className="text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold">
                    <AnimatedCount value={upcomingExams.length} />
                  </p>
                  <p className="text-xs text-muted-foreground truncate">Upcoming Exams</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={listItem}>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="trending_up" size={20} className="text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold">
                    <AnimatedCount value={avgGrade} />
                    <span className="text-sm">%</span>
                  </p>
                  <p className="text-xs text-muted-foreground truncate">Average Grade</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Latest Updates */}
        <motion.div variants={listItem} initial="hidden" animate="show">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon name="notifications" size={18} />
                  Latest Updates
                </CardTitle>
                <span className="text-sm text-muted-foreground">
                  Recent
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <Icon name="notifications_off" size={32} className="text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No new notifications</p>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
                  {notifications.map((n, idx) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...springTransition, delay: idx * 0.05 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                    >
                      <Link
                        to={n.link || '#'}
                        className="flex-shrink-0 w-64 block"
                      >
                        <Card className="border-l-4 border-l-primary h-full">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold leading-tight">{n.title}</p>
                              {!n.read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                            <p className="text-xs text-muted-foreground/60">{formatRelativeTime(n.createdAt)}</p>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Continue Watching + Pending Work */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Continue Watching */}
          <motion.div variants={listItem} initial="hidden" animate="show">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon name="play_circle" size={18} />
                    Continue Watching
                  </CardTitle>
                  <Link to="/student/subjects" className="text-sm text-primary hover:underline">
                    View all
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {enrolledSubjects.length === 0 ? (
                  <div className="flex flex-col items-center py-6 text-center">
                    <Icon name="play_disabled" size={32} className="text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No subjects enrolled yet</p>
                  </div>
                ) : (
                  enrolledSubjects.map((subject) => {
                    const enrollment = enrollments.find((e) => e.subjectId === subject.id);
                    const progress = enrollment?.progress ?? 0;
                    return (
                      <Link
                        key={subject.id}
                        to={`/student/subjects/${subject.id}`}
                        className="block"
                      >
                        <motion.div whileHover={{ x: 4 }} transition={springTransition}>
                          <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                            <div
                              className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${subject.color}15` }}
                            >
                              <Icon name={subject.icon} size={20} style={{ color: subject.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{subject.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Progress value={progress} className="flex-1 h-1.5" />
                                <span className="text-xs font-medium tabular-nums">{progress}%</span>
                              </div>
                            </div>
                            <Icon name="chevron_right" size={18} className="text-muted-foreground flex-shrink-0" />
                          </div>
                        </motion.div>
                      </Link>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pending Work */}
          <motion.div variants={listItem} initial="hidden" animate="show">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon name="assignment" size={18} />
                    Pending Work
                  </CardTitle>
                  <Link to="/assignments" className="text-sm text-primary hover:underline">
                    View all
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingAssignments.length === 0 ? (
                  <div className="flex flex-col items-center py-6 text-center">
                    <Icon name="task_alt" size={32} className="text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">All caught up! No pending assignments.</p>
                  </div>
                ) : (
                  pendingAssignments.map((assignment) => {
                    const subject = mockSubjects.find((s) => s.id === (mockTextbooks.find((tb) => tb.id === assignment.textbookId)?.subjectId ?? ''));
                    const urgency = getDueUrgency(assignment.dueDate);
                    return (
                      <Link
                        key={assignment.id}
                        to={`/assignments/${assignment.id}`}
                        className="block"
                      >
                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Icon name="description" size={18} className="text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{assignment.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {subject?.name ?? 'Unknown'} &middot; {assignment.maxPoints} pts
                            </p>
                          </div>
                          <Badge
                            variant={
                              urgency.variant === 'warning'
                                ? 'warning'
                                : urgency.variant === 'destructive'
                                  ? 'destructive'
                                  : urgency.variant === 'secondary'
                                    ? 'secondary'
                                    : 'outline'
                            }
                            className="flex-shrink-0 text-[10px]"
                          >
                            {urgency.label}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div variants={listItem} initial="hidden" animate="show">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon name="rocket_launch" size={18} />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Button variant="outline" className="justify-start h-auto py-3 gap-2" asChild>
                <Link to="/student/subjects">
                  <Icon name="menu_book" size={16} />
                  Subjects
                </Link>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3 gap-2" asChild>
                <Link to="/assignments">
                  <Icon name="assignment" size={16} />
                  Assignments
                </Link>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3 gap-2" asChild>
                <Link to="/student/exams">
                  <Icon name="fact_check" size={16} />
                  Exams
                </Link>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3 gap-2" asChild>
                <Link to="/student/timetable">
                  <Icon name="calendar_month" size={16} />
                  Timetable
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
}
