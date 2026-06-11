import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/authStore';
import { cn, getTimeGreeting } from '@/lib/utils';
import { pageTransition, listItem } from '@/lib/motion';
import { ROUTES } from '@/lib/constants';
import { getGradesByStudent, getEnrollmentsByStudent, getClass } from '@/services/dataService';

const motivationalMessages = [
  'Every expert was once a beginner. Keep going!',
  'The secret of getting ahead is getting started.',
  'Education is the most powerful weapon to change the world.',
  'The beautiful thing about learning is that no one can take it away from you.',
  'Success is the sum of small efforts repeated day in and day out.',
  'Believe you can and you\u2019re halfway there.',
];

interface ResultEntry { id: string; itemName: string; score: number; maxScore: number; percentage: number; gradedAt: string; feedback?: string }
interface DashboardData { displayName: string; greeting: string; motivationalMessage: string; todayDate: string; recentResults: ResultEntry[]; enrolledCount: number; className: string | null; classGrade: string | null; avgGrade: number; totalAssessments: number }

export default function StudentDashboardPage() {
  const authUser = useAuthStore((state) => state.user);
  const displayName = authUser?.displayName ?? 'Student';
  const studentId = authUser?.id;
  const messageIndex = new Date().getDate() % motivationalMessages.length;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['student-dashboard', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) throw new Error('Not authenticated');
      const now = new Date();
      const greeting = getTimeGreeting();
      const authUserData = useAuthStore.getState().user;

      const [grades, enrollments, classDoc] = await Promise.all([
        getGradesByStudent(studentId),
        getEnrollmentsByStudent(studentId),
        authUserData?.classId ? getClass(authUserData.classId) : Promise.resolve(null),
      ]);

      const recentResults: ResultEntry[] = grades
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((g) => ({
          id: g.id,
          itemName: g.itemName ?? 'Assessment',
          score: g.score,
          maxScore: g.totalPoints,
          percentage: g.percentage,
          gradedAt: g.createdAt,
          feedback: g.feedback,
        }));

      const avgGrade = grades.length > 0
        ? Math.round(grades.reduce((s, g) => s + g.percentage, 0) / grades.length)
        : 0;

      return {
        displayName, greeting, motivationalMessage: motivationalMessages[messageIndex],
        todayDate: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        recentResults,
        enrolledCount: enrollments.length,
        className: classDoc?.name ?? null,
        classGrade: classDoc?.grade ?? null,
        avgGrade,
        totalAssessments: grades.length,
      } satisfies DashboardData;
    },
  });

  return (
    <>
      <SEOHead title="Dashboard" description="Your student dashboard" />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-4xl mx-auto space-y-5 pb-24">
        <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="detail">
          {(dash) => (
            <div className="space-y-5">
              <motion.div variants={listItem} initial="hidden" animate="show">
                <div className="flex flex-col gap-1">
                  <h1 className="text-headline-sm">{dash.greeting}, {dash.displayName.split(' ')[0]}</h1>
                  <p className="text-body-md text-on-surface-variant">{dash.todayDate}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {dash.className && (
                      <Badge variant="info" className="text-xs gap-1">
                        <Icon name="school" size={12} />{dash.className}{dash.classGrade ? ` (Grade ${dash.classGrade})` : ''}
                      </Badge>
                    )}
                  </div>
                  <p className="text-body-md italic text-on-surface-variant/80 mt-1">{dash.motivationalMessage}</p>
                </div>
              </motion.div>

              <motion.div variants={listItem} initial="hidden" animate="show">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: 'school', label: 'Subjects', value: dash.enrolledCount, color: 'text-primary bg-primary-container' },
                    { icon: 'grade', label: 'Avg Grade', value: `${dash.avgGrade}%`, color: 'text-success bg-success-container' },
                    { icon: 'checklist', label: 'Completed', value: dash.totalAssessments, color: 'text-warning bg-warning-container' },
                    { icon: 'group', label: 'Class', value: dash.className ?? '—', color: 'text-tertiary bg-tertiary-container' },
                  ].map((stat) => (
                    <Card key={stat.label} variant="elevated" className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${stat.color}`}>
                          <Icon name={stat.icon} size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                          <p className="text-lg font-bold">{stat.value}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={listItem} initial="hidden" animate="show">
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-auto py-4 justify-start gap-3" asChild>
                    <Link to={ROUTES.STUDENT_TASKS}>
                      <div className="h-10 w-10 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                        <Icon name="checklist" size={20} className="text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold">View Tasks</p>
                        <p className="text-xs text-muted-foreground">Pending assignments &amp; quizzes</p>
                      </div>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 justify-start gap-3" asChild>
                    <Link to={ROUTES.STUDENT_EXAMS}>
                      <div className="h-10 w-10 rounded-full bg-error-container flex items-center justify-center shrink-0">
                        <Icon name="fact_check" size={20} className="text-error" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold">View Exams</p>
                        <p className="text-xs text-muted-foreground">Upcoming &amp; past results</p>
                      </div>
                    </Link>
                  </Button>
                </div>
              </motion.div>

              <motion.div variants={listItem} initial="hidden" animate="show">
                <Card variant="elevated">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-title-sm flex items-center gap-2"><Icon name="grade" size={18} />Recent Results</CardTitle>
                    {dash.recentResults.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">Last 5</Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    {dash.recentResults.length === 0 ? (
                      <div className="flex flex-col items-center py-6 text-center">
                        <Icon name="rate_review" size={32} className="text-on-surface-variant/50 mb-2" />
                        <p className="text-body-md text-on-surface-variant">No results yet. Complete assessments to see your grades here.</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {dash.recentResults.map((result) => {
                          const colorClass = result.percentage >= 80 ? 'text-success bg-success-container/30' : result.percentage >= 60 ? 'text-warning bg-warning-container/30' : 'text-error bg-error-container/30';
                          return (
                            <motion.div key={result.id} whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 700, damping: 0.9 }}>
                              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-variant/50 transition-colors">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{result.itemName}</p>
                                  <p className="text-label-sm text-on-surface-variant">{result.score}/{result.maxScore}{result.feedback ? <span className="ml-2 text-on-surface-variant/60">&middot; {result.feedback}</span> : null}</p>
                                </div>
                                <div className={cn('h-9 min-w-[3rem] px-2 rounded-lg flex items-center justify-center text-label-sm font-semibold', colorClass)}>{result.percentage}%</div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
