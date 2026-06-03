import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/Icon';
import { cn, getInitials } from '@/lib/utils';
import { formatDate, formatRelativeTime } from '@/lib/format';
import { pageTransition, listContainer, listItem, springTransition } from '@/lib/motion';
import {
  mockUsers,
  mockSubjects,
  mockExams,
  mockEnrollments,
  mockGrades,
  mockClasses,
  mockSubmissions,
  mockCorrections,
} from '@/lib/mockData';

const NOW = new Date();

function KPICard({
  icon,
  label,
  value,
  color,
  bg,
  delay = 0,
}: {
  icon: string;
  label: string;
  value: string | number;
  color: string;
  bg: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springTransition, delay }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center', bg)}>
            <Icon name={icon} size={22} className={color} />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SubmissionItem({
  submission,
  student,
  subjectName,
}: {
  submission: typeof mockSubmissions[0];
  student: (typeof mockUsers)[keyof typeof mockUsers];
  subjectName: string;
}) {
  return (
    <motion.div variants={listItem}>
      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-xs">{getInitials(student.displayName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{student.displayName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {subjectName} &middot; {formatRelativeTime(submission.submittedAt)}
          </p>
        </div>
        <Badge
          variant={submission.status === 'graded' ? 'success' : 'warning'}
          className="text-[10px]"
        >
          {submission.status}
        </Badge>
      </div>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

function ErrorDisplay({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-4">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <Icon name="error" size={28} className="text-destructive" />
          </div>
          <p className="text-lg font-semibold">Failed to load dashboard</p>
          <p className="text-sm text-muted-foreground">Please check your connection and try again</p>
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <Icon name="refresh" size={16} />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TeacherDashboardPage() {
  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 600));
      return null;
    },
  });

  const stats = useMemo(() => {
    const totalStudents = [...new Set(mockEnrollments.map((e) => e.studentId))].length;

    const pendingReviews = mockSubmissions.filter((s) => (s as { status: string }).status !== 'graded').length;

    const upcomingExams = mockExams.filter((e) => new Date(e.startDate) > NOW).length;

    const gradedEntries = mockGrades.filter((g) => g.percentage != null);
    const classAverage =
      gradedEntries.length > 0
        ? Math.round(
            gradedEntries.reduce((sum, g) => sum + g.percentage, 0) / gradedEntries.length,
          )
        : 0;

    return [
      {
        icon: 'group',
        label: 'Total Students',
        value: totalStudents,
        color: 'text-blue-600',
        bg: 'bg-blue-500/10',
        delay: 0,
      },
      {
        icon: 'rate_review',
        label: 'Pending Reviews',
        value: pendingReviews,
        color: 'text-amber-600',
        bg: 'bg-amber-500/10',
        delay: 0.1,
      },
      {
        icon: 'calendar_today',
        label: 'Upcoming Exams',
        value: upcomingExams,
        color: 'text-violet-600',
        bg: 'bg-violet-500/10',
        delay: 0.15,
      },
      {
        icon: 'graded',
        label: 'Class Average',
        value: `${classAverage}%`,
        color: 'text-emerald-600',
        bg: 'bg-emerald-500/10',
        delay: 0.2,
      },
    ];
  }, []);

  const recentSubmissions = useMemo(() => {
    const teacherSubjectIds = mockSubjects.map((s) => s.id);
    return mockSubmissions
      .filter((s) => {
        const enrollment = mockEnrollments.find((e) => e.studentId === s.studentId);
        return enrollment && teacherSubjectIds.includes(enrollment.subjectId);
      })
      .slice(0, 5);
  }, []);

  const pendingCorrections = useMemo(() => {
    return mockExams
      .filter((e) => {
        const corrections = mockCorrections.filter((c) => c.examId === e.id);
        return corrections.length === 0;
      })
      .slice(0, 4);
  }, []);

  const upcomingExamsList = useMemo(() => {
    return mockExams
      .filter((e) => new Date(e.startDate) > NOW)
      .sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      )
      .slice(0, 3)
      .map((e) => ({
        ...e,
        subject: mockSubjects.find((s) => s.id === e.courseId),
      }));
  }, []);

  if (isLoading) return <DashboardSkeleton />;

  if (isError) return <ErrorDisplay onRetry={() => refetch()} />;

  return (
    <>
      <SEOHead
        title="Teacher Dashboard"
        description="Your classroom overview at a glance"
        canonical="/teacher/dashboard"
      />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 max-w-6xl mx-auto space-y-6 pb-20"
      >
        {/* Header */}
        <motion.div variants={listItem}>
          <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s your classroom overview
          </p>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <KPICard key={stat.label} {...stat} />
          ))}
        </div>

        {/* Middle Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Submissions */}
          <motion.div variants={listItem}>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon name="assignment" size={18} className="text-muted-foreground" />
                  Recent Submissions
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {recentSubmissions.length}
                </Badge>
              </CardHeader>
              <CardContent>
                {recentSubmissions.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Icon name="inbox" size={36} className="text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No recent submissions</p>
                  </div>
                ) : (
                  <motion.div
                    variants={listContainer}
                    initial="hidden"
                    animate="show"
                    className="space-y-1"
                  >
                    {recentSubmissions.map((sub) => {
                      const student =
                        Object.values(mockUsers).find((u) => u.id === sub.studentId) ||
                        mockUsers.student1;
                      const enrollment = mockEnrollments.find(
                        (e) => e.studentId === sub.studentId,
                      );
                      const subject = mockSubjects.find(
                        (s) => s.id === enrollment?.subjectId,
                      );
                      return (
                        <SubmissionItem
                          key={sub.id}
                          submission={sub}
                          student={student}
                          subjectName={subject?.name ?? 'Unknown'}
                        />
                      );
                    })}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pending Corrections */}
          <motion.div variants={listItem}>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon name="fact_check" size={18} className="text-muted-foreground" />
                  Pending Corrections
                </CardTitle>
                <Badge variant="warning" className="text-xs">
                  {pendingCorrections.length}
                </Badge>
              </CardHeader>
              <CardContent>
                {pendingCorrections.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <Icon name="check_circle" size={36} className="text-emerald-400/60" />
                    <p className="text-sm text-muted-foreground">All exams corrected!</p>
                  </div>
                ) : (
                  <motion.div
                    variants={listContainer}
                    initial="hidden"
                    animate="show"
                    className="space-y-1"
                  >
                    {pendingCorrections.map((exam) => {
                      const subject = mockSubjects.find((s) => s.id === exam.courseId);
                      return (
                        <motion.div key={exam.id} variants={listItem}>
                          <Link
                            to={`/teacher/exams/${exam.id}/correct`}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors group"
                          >
                            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                              <Icon
                                name="fact_check"
                                size={18}
                                className="text-amber-600"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                {exam.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {subject?.name ?? 'Unknown'} &middot;{' '}
                                {formatDate(exam.startDate)}
                              </p>
                            </div>
                            <Icon
                              name="chevron_right"
                              size={18}
                              className="text-muted-foreground/50 group-hover:translate-x-0.5 transition-transform"
                            />
                          </Link>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Upcoming Exams */}
        <motion.div variants={listItem}>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon name="calendar_today" size={18} className="text-muted-foreground" />
                Upcoming Exams
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/teacher/exams" className="gap-1 text-xs">
                  View all <Icon name="arrow_forward" size={14} />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingExamsList.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Icon name="event_busy" size={36} className="text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No upcoming exams scheduled</p>
                </div>
              ) : (
                <motion.div
                  variants={listContainer}
                  initial="hidden"
                  animate="show"
                  className="space-y-3"
                >
                  {upcomingExamsList.map((exam) => {
                    const diff = new Date(exam.startDate).getTime() - NOW.getTime();
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    return (
                      <motion.div key={exam.id} variants={listItem}>
                        <Link to={`/teacher/exams/${exam.id}/correct`}>
                          <Card className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                                <Icon
                                  name="quiz"
                                  size={20}
                                  className="text-violet-600"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{exam.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {exam.subject?.name ?? 'Unknown'} &middot;{' '}
                                  {exam.questions.length} questions &middot;{' '}
                                  {exam.timeLimit} min
                                </p>
                              </div>
                              <Badge
                                variant={days <= 3 ? 'warning' : 'secondary'}
                                className="text-[10px] flex-shrink-0"
                              >
                                {days <= 0
                                  ? 'Today'
                                  : days === 1
                                    ? 'Tomorrow'
                                    : `${days} days`}
                              </Badge>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
}
