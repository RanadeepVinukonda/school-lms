import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/Icon';
import { getInitials } from '@/lib/utils';
import { formatDate, getLetterGrade } from '@/lib/format';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { ROUTES } from '@/lib/constants';
import { getChildDashboard } from '@/services/parentService';

function pctColor(pct: number) {
  return pct >= 80 ? 'text-on-success-container' : pct >= 60 ? 'text-on-warning-container' : 'text-on-error-container';
}

export default function ParentChildDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();

  const { isLoading, error, refetch, data } = useQuery({
    queryKey: ['parent-child-detail', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      return getChildDashboard(studentId);
    },
    enabled: !!studentId,
  });

  const notFound = !isLoading && !error && !data && !!studentId;

  const grades = useMemo(() => {
    if (!data) return [];
    return ((data as any).grades ?? []).sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [data]);

  const recentActivity = (data as any)?.recentActivity ?? [];

  return (
    <>
      <SEOHead
        title={data ? `${(data as any).student.displayName} - Child Details` : 'Child Details'}
        description="View your child's performance and progress"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto space-y-16 pb-32"
      >
        {notFound ? (
          <Card className="border-border/60">
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <Icon name="person_off" size={48} className="text-muted-foreground/40" />
              <p className="text-lg font-medium">Student not found</p>
              <p className="text-sm text-muted-foreground">
                The student you&apos;re looking for doesn&apos;t exist or is not linked to your account.
              </p>
              <Button asChild>
                <Link to={ROUTES.PARENT_CHILDREN}>
                  <Icon name="arrow_back" size={16} className="mr-1" />
                  Back to Children
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <DataFetchWrapper
            data={data}
            isLoading={isLoading}
            error={error}
            onRetry={() => refetch()}
            loadingType="detail"
          >
            {(d: any) => (
              <>
                <motion.div variants={cardStackReveal} custom={0}>
                  <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2">
                    <Link to={ROUTES.PARENT_CHILDREN}>
                      <Icon name="arrow_back" size={16} />
                      Back to Children
                    </Link>
                  </Button>
                </motion.div>

                <motion.div variants={cardStackReveal} custom={0}>
                  <Card className="border-border/60">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-5 flex-wrap">
                        <Avatar className="h-16 w-16">
                          <AvatarFallback className="text-lg">{getInitials(d.student.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h1 className="text-headline-sm">{d.student.displayName}</h1>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                            {d.student.studentId && (
                              <span className="flex items-center gap-1">
                                <Icon name="badge" size={15} />
                                {d.student.studentId}
                              </span>
                            )}
                            {d.className && (
                              <span className="flex items-center gap-1">
                                <Icon name="school" size={15} />
                                {d.className}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Icon name="email" size={15} />
                              {d.student.email}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-display-sm font-bold tabular-nums ${pctColor(d.overallAvgScore)}`}>
                            {d.overallAvgScore}%
                          </p>
                          <p className="text-label-xs text-muted-foreground">Overall Avg</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardStackReveal} custom={0}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { icon: 'graded', label: 'Total Assessments', value: d.totalAttempts, bg: 'bg-primary-container', color: 'text-primary' },
                      { icon: 'trending_up', label: 'Overall Avg Score', value: `${d.overallAvgScore}%`, bg: 'bg-secondary-container', color: 'text-secondary' },
                      { icon: 'school', label: 'Class', value: d.className ?? 'N/A', bg: 'bg-success-container', color: 'text-success' },
                    ].map((stat) => (
                      <Card key={stat.label} className="border-border/60">
                        <CardContent className="p-5 flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}>
                            <Icon name={stat.icon} size={22} className={stat.color} />
                          </div>
                          <div>
                            <p className="text-display-xs font-bold tabular-nums leading-none mb-1">{stat.value}</p>
                            <p className="text-label-sm text-muted-foreground">{stat.label}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>

                {recentActivity.length > 0 && (
                  <motion.div variants={cardStackReveal} custom={0}>
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-title-md flex items-center gap-2 flex-wrap">
                          <Icon name="history" size={18} className="text-muted-foreground" />
                          Recent Activity
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5">
                        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
                          {recentActivity.map((act: any, idx: number) => (
                            <motion.div
                              key={idx}
                              variants={scrollReveal}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                            >
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Icon
                                  name={act.type === 'quiz' ? 'quiz' : act.type === 'exam' ? 'fact_check' : 'assignment'}
                                  size={16}
                                  className="text-primary"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate capitalize">{act.type}: {act.title}</p>
                                <p className="text-xs text-muted-foreground">{act.date ? formatDate(act.date) : ''}</p>
                              </div>
                              <span className={`font-semibold tabular-nums text-sm ${pctColor(act.score)}`}>
                                {act.score}%
                              </span>
                            </motion.div>
                          ))}
                        </motion.div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                <motion.div variants={cardStackReveal} custom={0}>
                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-title-md flex items-center gap-2 flex-wrap">
                          <Icon name="graded" size={18} className="text-muted-foreground" />
                          Grades
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {grades.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                          <Icon name="graded" size={32} className="text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No grades yet</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/30">
                                <th className="text-left font-medium text-muted-foreground px-4 py-3">Item</th>
                                <th className="text-center font-medium text-muted-foreground px-4 py-3">Score</th>
                                <th className="text-center font-medium text-muted-foreground px-4 py-3">Percentage</th>
                                <th className="text-right font-medium text-muted-foreground px-4 py-3">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {grades.map((grade: any) => (
                                <tr key={grade.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                  <td className="px-4 py-3">
                                    <p className="font-medium">{grade.itemName ?? 'Untitled'}</p>
                                    <Badge variant="secondary" className="text-[10px] mt-0.5">
                                      {grade.type ?? 'assessment'}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-center tabular-nums">
                                    {grade.score}/{grade.totalPoints}
                                  </td>
                                  <td className={`px-4 py-3 text-center font-semibold tabular-nums ${pctColor(grade.percentage)}`}>
                                    {grade.percentage}%
                                  </td>
                                  <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                                    {grade.createdAt ? formatDate(grade.createdAt) : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardStackReveal} custom={0}>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild variant="outline" className="gap-1">
                      <Link to={ROUTES.PARENT_REPORTS}>
                        <Icon name="analytics" size={16} />
                        View Reports
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="gap-1">
                      <Link to={ROUTES.PARENT_REPORTS}>
                        <Icon name="auto_awesome" size={16} />
                        Generate AI Report
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              </>
            )}
          </DataFetchWrapper>
        )}
      </motion.div>
    </>
  );
}
