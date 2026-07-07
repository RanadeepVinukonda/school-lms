import { useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { motion, useInView } from 'framer-motion';
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
import { staggerContainer, cardStackReveal } from '@/lib/motion';
import { ROUTES } from '@/lib/constants';
import api from '@/services/api';
import { getClass } from '@/services/dataService';

interface ResultEntry { id: string; itemName: string; score: number; maxScore: number; percentage: number; gradedAt: string; feedback?: string }

interface DashboardData {
  displayName: string; greeting: string; motivationalMessage: string; todayDate: string;
  recentResults: ResultEntry[]; subjectsCount: number; className: string | null;
  classGrade: string | null; avgGrade: number; totalAssessments: number;
}

function SectionTitle({ label, title }: { label: string; title: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.05, 0, 0.133333, 0.06] }}
      className="mb-8"
    >
      <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-2">{label}</p>
      <h2 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{title}</h2>
    </motion.div>
  );
}

export default function StudentDashboardPage() {
  const { _ } = useTranslation();
  const authUser = useAuthStore((state) => state.user);
  const displayName = authUser?.displayName ?? _('Student');
  const studentId = authUser?.id;
  const messages = [
    _('Every expert was once a beginner. Keep going!'),
    _('The secret of getting ahead is getting started.'),
    _('Education is the most powerful weapon to change the world.'),
    _('The beautiful thing about learning is that no one can take it away from you.'),
    _('Success is the sum of small efforts repeated day in and day out.'),
    _('Believe you can and you are halfway there.'),
  ];
  const messageIndex = new Date().getDate() % messages.length;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['student-dashboard', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      if (!studentId) throw new Error('Not authenticated');
      const now = new Date();
      const greeting = getTimeGreeting();
      const authUserData = useAuthStore.getState().user;

      const [dashRes, classDoc] = await Promise.all([
        api.get(`/analytics/student/dashboard`).then((r) => r.data.data),
        authUserData?.classId ? getClass(authUserData.classId) : Promise.resolve(null),
      ]);

      const recentResults: ResultEntry[] = [];

      return {
        displayName, greeting, motivationalMessage: messages[messageIndex],
        todayDate: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        recentResults, subjectsCount: classDoc?.subjectIds?.length ?? 0,
        className: classDoc?.name ?? null, classGrade: classDoc?.grade ?? null,
        avgGrade: dashRes.averageScore ?? 0, totalAssessments: dashRes.totalAssessments ?? 0,
      } satisfies DashboardData;
    },
  });

  return (
    <>
      <SEOHead title={_('Dashboard')} description={_('Your student dashboard')} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32"
      >
        <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="detail">
          {(dash) => (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-20"
            >
              <section>
                <motion.div variants={cardStackReveal} custom={0}>
                  <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-3">
                    {dash.todayDate}
                  </p>
                  <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight mb-2">
                    {dash.greeting}, {dash.displayName.split(' ')[0]}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {dash.className && (
                      <Badge variant="info" className="text-xs gap-1">
                        <Icon name="school" size={12} />{dash.className}{dash.classGrade ? ` (${_('Grade')} ${dash.classGrade})` : ''}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs italic">{dash.motivationalMessage}</Badge>
                  </div>
                </motion.div>
              </section>

              <section>
                <SectionTitle label={_('Overview')} title={_('Your performance at a glance')} />
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-60px' }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  {[
                    { icon: 'school', label: _('Subjects'), value: dash.subjectsCount, color: 'text-primary', bg: 'bg-primary-container' },
                    { icon: 'grade', label: _('Avg Grade'), value: `${dash.avgGrade}%`, color: 'text-success', bg: 'bg-success-container' },
                    { icon: 'checklist', label: _('Completed'), value: dash.totalAssessments, color: 'text-warning', bg: 'bg-warning-container' },
                    { icon: 'group', label: _('Class'), value: dash.className ?? '\u2014', color: 'text-tertiary', bg: 'bg-tertiary-container' },
                  ].map((stat) => (
                    <motion.div key={stat.label} variants={cardStackReveal} custom={0}>
                      <Card className="h-full border-border/60">
                        <CardContent className="p-5">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 ${stat.bg}`}>
                            <Icon name={stat.icon} size={22} className={stat.color} />
                          </div>
                          <p className="text-display-xs font-bold tracking-tight">{stat.value}</p>
                          <p className="text-label-sm text-muted-foreground mt-1">{stat.label}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </section>

              <section>
                <SectionTitle label={_('Quick Links')} title={_('Navigate your studies')} />
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-60px' }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {[
                    { icon: 'checklist', label: _('View Tasks'), desc: _('Pending assignments & quizzes'), bg: 'bg-primary-container', color: 'text-primary', to: ROUTES.STUDENT_TASKS },
                    { icon: 'fact_check', label: _('View Exams'), desc: _('Upcoming & past results'), bg: 'bg-error-container', color: 'text-error', to: ROUTES.STUDENT_EXAMS },
                  ].map((link) => (
                    <motion.div key={link.label} variants={cardStackReveal} custom={0}>
                      <Button variant="outline" className="w-full h-auto py-5 justify-start gap-4 border-border/60" asChild>
                        <Link to={link.to}>
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${link.bg}`}>
                            <Icon name={link.icon} size={22} className={link.color} />
                          </div>
                          <div className="text-left">
                            <p className="text-title-sm font-bold">{link.label}</p>
                            <p className="text-label-sm text-muted-foreground">{link.desc}</p>
                          </div>
                        </Link>
                      </Button>
                    </motion.div>
                  ))}
                </motion.div>
              </section>

              <section>
                <SectionTitle label={_('Results')} title={_('Recent assessment scores')} />
                <motion.div variants={cardStackReveal} custom={0}>
                  <Card className="border-border/60">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-title-sm flex items-center gap-2">
                        <Icon name="grade" size={18} />{_('Recent Results')}
                      </CardTitle>
                      {dash.recentResults.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">{_('Last 5')}</Badge>
                      )}
                    </CardHeader>
                    <CardContent>
                      {dash.recentResults.length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-center">
                          <Icon name="rate_review" size={36} className="text-muted-foreground/30 mb-3" />
                          <p className="text-body-md text-muted-foreground">{_('No results yet. Complete assessments to see your grades here.')}</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {dash.recentResults.map((result) => {
                            const colorClass = result.percentage >= 80
                              ? 'text-success bg-success-container/30'
                              : result.percentage >= 60
                              ? 'text-warning bg-warning-container/30'
                              : 'text-error bg-error-container/30';
                            return (
                              <motion.div
                                key={result.id}
                                whileHover={{ x: 4 }}
                                transition={{ type: 'spring', stiffness: 700, damping: 0.9 }}
                              >
                                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-title-sm font-semibold truncate">{result.itemName}</p>
                                    <p className="text-label-sm text-muted-foreground">
                                      {result.score}/{result.maxScore}
                                      {result.feedback && <span className="ml-2 text-muted-foreground/60">&middot; {result.feedback}</span>}
                                    </p>
                                  </div>
                                  <div className={cn('h-9 min-w-[3rem] px-3 rounded-lg flex items-center justify-center text-label-sm font-bold', colorClass)}>
                                    {result.percentage}%
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </section>
            </motion.div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
