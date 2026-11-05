import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { getChildren, getRecommendations, getYearlyReport } from '@/services/parentService';

export default function ParentReportsPage() {
  const [yearlyChildId, setYearlyChildId] = useState<string | null>(null);
  const { data: children } = useQuery({
    queryKey: ['parent-children'],
    queryFn: getChildren,
  });

  const { data: recommendations, isLoading: recsLoading } = useQuery({
    queryKey: ['parent-recommendations'],
    queryFn: getRecommendations,
  });

  const { data: yearlyReportData, isLoading: yearlyLoading, error: yearlyError, refetch: refetchYearly } = useQuery({
    queryKey: ['parent-yearly-report', yearlyChildId],
    queryFn: async () => {
      if (!yearlyChildId) return null;
      return await getYearlyReport(yearlyChildId);
    },
    enabled: !!yearlyChildId,
  });

  const getChildClassName = (id: string) => {
    if (!children) return null;
    const child = children.find((c: any) => c.id === id);
    return child?.classInfo?.name ?? child?.class_name ?? null;
  };

  const selectedChildClassName = yearlyChildId ? getChildClassName(yearlyChildId) : null;

  return (
    <>
      <SEOHead title="Reports" description="Progress report cards and recommendations for your child" canonical="/parent/reports" />
      <div



        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <div>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">Reports & Recommendations</h1>
          <p className="text-body-md text-muted-foreground mt-1">Progress insights and recommendations for your child</p>
        </div>

        <section>
          <div>
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-title-md flex items-center gap-2 flex-wrap">
                  <Icon name="assignment" size={18} className="text-muted-foreground" />
                  Report Card
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Standard progress report card showing subject-wise marks, overall score, attendance, and class rank for the current academic year.
                </p>

                {children && children.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {children.map((child: any) => (
                      <Button
                        key={child.id}
                        variant={yearlyChildId === child.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setYearlyChildId(child.id)}
                        className="gap-1"
                      >
                        <Icon name="person" size={14} />
                        {child.displayName}
                      </Button>
                    ))}
                  </div>
                )}

                {yearlyChildId && (
                  <>
                    <DataFetchWrapper
                      data={yearlyReportData}
                      isLoading={yearlyLoading}
                      error={yearlyError}
                      onRetry={() => refetchYearly()}
                      loadingType="card"
                    >
                      {(r: any) => (
                        <div



                          className="space-y-4 mt-4"
                        >
                          <div className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/5 to-primary/10 p-5 text-center">
                            <p className="text-title-sm font-bold">{r.student?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Class: {selectedChildClassName || r.student?.class || 'N/A'}{' '}
                              &middot; Academic Year: {r.academicYear}
                            </p>
                            <div className="mt-4">
                              <p className="text-[2.5rem] leading-none font-bold tracking-tight">{r.overallPercentage}%</p>
                              <p className="mt-1 text-label-xs text-muted-foreground uppercase tracking-wider">Overall Score</p>
                              {r.gpa != null && (
                                <p className="mt-1 text-sm text-muted-foreground">GPA: {r.gpa}</p>
                              )}
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <div className="rounded-lg bg-background/80 border border-border/60 px-3 py-2">
                                <p className="text-headline-sm font-bold text-primary">
                                  {r.classRank != null ? `#${r.classRank}` : '-'}
                                  <span className="text-label-xs text-muted-foreground font-normal"> / {r.classTotalStudents || '—'}</span>
                                </p>
                                <p className="text-label-xs text-muted-foreground mt-0.5">Class Rank</p>
                              </div>
                              <div className="rounded-lg bg-background/80 border border-border/60 px-3 py-2">
                                <p className="text-headline-sm font-bold text-primary">
                                  {r.globalRank != null ? `#${r.globalRank}` : '-'}
                                  <span className="text-label-xs text-muted-foreground font-normal"> / {r.totalStudents || '—'}</span>
                                </p>
                                <p className="text-label-xs text-muted-foreground mt-0.5">School Rank</p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-center gap-4 text-sm text-muted-foreground">
                              <span>{r.totalAssessments} Assessments</span>
                            </div>
                          </div>

                          {r.subjects && r.subjects.length > 0 && (
                            <div>
                              <p className="text-title-sm font-bold mb-2">Subject Performance</p>
                              <div className="border border-border/60 rounded-xl overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                  <thead>
                                    <tr className="bg-muted/30 border-b border-border/60">
                                      <th className="px-3 py-2 font-semibold">Subject</th>
                                      <th className="px-3 py-2 text-center font-semibold">Average %</th>
                                      <th className="px-3 py-2 text-center font-semibold">Grade</th>
                                      <th className="px-3 py-2 text-center font-semibold">Assessments</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/40">
                                    {r.subjects.map((s: any, i: number) => (
                                      <tr key={i} className="hover:bg-muted/20">
                                        <td className="px-3 py-2 font-medium">{s.name}</td>
                                        <td className="px-3 py-2 text-center">{s.averagePercentage}%</td>
                                        <td className="px-3 py-2 text-center">
                                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            s.averagePercentage >= 80 ? 'bg-success-container text-success' :
                                            s.averagePercentage >= 60 ? 'bg-warning-container text-warning' :
                                            'bg-error-container text-error'
                                          }`}>{s.grade}</span>
                                        </td>
                                        <td className="px-3 py-2 text-center">{s.assessmentsCount}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {r.attendance && (
                            <div className="p-3 rounded-lg bg-card border">
                              <p className="text-title-sm font-bold mb-1">Attendance Summary</p>
                              <p className="text-sm text-muted-foreground">
                                Present: {r.attendance.presentDays} / {r.attendance.totalDays} = {r.attendance.percentage}%
                              </p>
                            </div>
                          )}

                          {r.weakConcepts && r.weakConcepts.length > 0 && (
                            <div>
                              <p className="text-title-sm font-bold mb-2">Weak Concepts (Practice Recommended)</p>
                              <div className="space-y-2">
                                {r.weakConcepts.map((c: any, i: number) => (
                                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-error-container/10 border border-error-container/30">
                                    <Icon name="warning" size={16} className="text-error shrink-0" />
                                    <p className="text-sm flex-1">
                                      {c.subjectName && <span className="font-semibold text-muted-foreground">{c.subjectName}: </span>}
                                      {c.name}
                                    </p>
                                    <span className="text-xs font-mono text-muted-foreground">{c.masteryScore}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {r.gamification && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {[
                                { label: 'XP', value: r.gamification.xp, icon: 'bolt' },
                                { label: 'Level', value: r.gamification.level, icon: 'auto_awesome' },
                                { label: 'Badges', value: r.gamification.badges, icon: 'military_tech' },
                                { label: 'Streak', value: `${r.gamification.streak}d`, icon: 'local_fire_department' },
                              ].map((stat, i) => (
                                <div key={i} className="text-center p-3 rounded-lg bg-card border">
                                  <Icon name={stat.icon} size={18} className="text-primary mx-auto" />
                                  <p className="text-title-sm font-bold mt-1">{stat.value}</p>
                                  <p className="text-label-xs text-muted-foreground">{stat.label}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </DataFetchWrapper>
                  </>
                )}

                {(!children || children.length === 0) && (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <Icon name="person_off" size={32} className="text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No children linked to your account</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <div>
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-title-md flex items-center gap-2 flex-wrap">
                  <Icon name="checklist" size={18} className="text-muted-foreground" />
                  Recommendations Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <DataFetchWrapper
                  data={recommendations}
                  isLoading={recsLoading}
                  error={null}
                  onRetry={() => {}}
                  loadingType="card"
                >
                  {(recs: any) => (
                    <>
                      {recs.recommendations?.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                          <Icon name="check_circle" size={32} className="text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No recommendations available</p>
                        </div>
                      ) : (
                        <div



                          className="space-y-6"
                        >
                          {recs.recommendations?.map((childRec: any) => (
                            <div key={childRec.studentId}>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="h-8 w-8 rounded-lg bg-primary-container flex items-center justify-center">
                                  <Icon name="person" size={16} className="text-primary" />
                                </div>
                                <p className="text-title-sm font-bold">{childRec.studentName}</p>
                                <Badge variant="secondary" className="text-label-xs">
                                  Avg: {childRec.averageScore}%
                                </Badge>
                              </div>
                              <div className="space-y-2 ml-2">
                                {childRec.recommendations?.map((rec: any, i: number) => (
                                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30">
                                    <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                                      rec.priority === 'high' ? 'bg-error' : rec.priority === 'medium' ? 'bg-warning' : 'bg-success'
                                    }`} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">{rec.area}</p>
                                      <p className="text-xs text-muted-foreground">{rec.suggestion}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </DataFetchWrapper>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </>
  );
}
