import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/Icon';
import { PerformanceLogoBadge } from '@/components/common/PerformanceLogoBadge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { schoolAnalyticsService } from '@/services/schoolAnalyticsService';

function BarChart({ data, labelKey, valueKey, color = 'bg-primary', maxValue }: { data: Record<string, number | string>[]; labelKey: string; valueKey: string; color?: string; maxValue?: number }) {
  const max = maxValue || 100;
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-2 sm:gap-3">
          <span className="text-label-xs sm:text-label-sm font-medium w-20 sm:w-32 truncate shrink-0 text-right">{item[labelKey]}</span>
          <div className="flex-1 h-6 rounded-full bg-muted/40 overflow-hidden">
            <div
              className={`h-full rounded-full ${color} flex items-center justify-end pr-2 text-[10px] text-white font-bold`}
              style={{ width: `${Math.min(Math.max(Number(item[valueKey]) / max * 100, Number(item[valueKey]) > 0 ? 6 : 0), 100)}%` }}
            >
              {item[valueKey]}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface RankChipProps {
  rank: number;
}
function RankChip({ rank }: RankChipProps) {
  const idx = rank - 1;
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
      idx === 0 ? 'bg-warning-container text-warning' :
      idx === 1 ? 'bg-muted text-muted-foreground' :
      idx === 2 ? 'bg-error-container/40 text-error' :
      'bg-muted/30 text-muted-foreground'
    }`}>
      {rank}
    </span>
  );
}

export default function AdminSchoolAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: overviewData, isLoading: overviewLoading, isError: overviewError, refetch: refetchOverview } = useQuery({
    queryKey: ['school-analytics-overview'],
    queryFn: () => schoolAnalyticsService.getSchoolOverview().then((r) => r.data),
  });

  const { data: gradeData, isLoading: gradeLoading, isError: gradeError, refetch: refetchGrade } = useQuery({
    queryKey: ['school-analytics-grade'],
    queryFn: () => schoolAnalyticsService.getGradeComparison().then((r) => r.data),
    enabled: activeTab === 'grades',
  });

  const { data: teacherData, isLoading: teacherLoading, isError: teacherError, refetch: refetchTeacher } = useQuery({
    queryKey: ['school-analytics-teacher'],
    queryFn: () => schoolAnalyticsService.getTeacherComparison().then((r) => r.data),
    enabled: activeTab === 'teachers',
  });

  const { data: classData, isLoading: classLoading, isError: classError, refetch: refetchClass } = useQuery({
    queryKey: ['school-analytics-class'],
    queryFn: () => schoolAnalyticsService.getClassComparison().then((r) => r.data),
    enabled: activeTab === 'classes',
  });

  const { data: studentData, isLoading: studentLoading, isError: studentError, refetch: refetchStudents } = useQuery({
    queryKey: ['school-analytics-students'],
    queryFn: () => schoolAnalyticsService.getStudentComparison().then((r) => r.data),
    enabled: activeTab === 'students',
  });

  const { data: trendData, isLoading: trendLoading, isError: trendError, refetch: refetchTrends } = useQuery({
    queryKey: ['school-analytics-trends'],
    queryFn: () => schoolAnalyticsService.getPerformanceTrends().then((r) => r.data),
    enabled: activeTab === 'trends',
  });

  const dataMap = { overview: overviewData, grades: gradeData, teachers: teacherData, classes: classData, students: studentData, trends: trendData } as const;
  const loadingMap = { overview: overviewLoading, grades: gradeLoading, teachers: teacherLoading, classes: classLoading, students: studentLoading, trends: trendLoading } as const;
  const errorMap = { overview: overviewError, grades: gradeError, teachers: teacherError, classes: classError, students: studentError, trends: trendError } as const;
  const refetchMap = { overview: refetchOverview, grades: refetchGrade, teachers: refetchTeacher, classes: refetchClass, students: refetchStudents, trends: refetchTrends } as const;
  const statCards = useMemo(() => {
    if (!overviewData) return [];
    return [
      { icon: 'groups', label: 'Total Students', value: overviewData.totalStudents, color: 'text-primary', bg: 'bg-primary-container' },
      { icon: 'badge', label: 'Total Teachers', value: overviewData.totalTeachers, color: 'text-success', bg: 'bg-success-container' },
      { icon: 'meeting_room', label: 'Total Classes', value: overviewData.totalClasses, color: 'text-warning', bg: 'bg-warning-container' },
      { icon: 'trending_up', label: 'Avg Performance', value: `${overviewData.averagePerformance}%`, color: 'text-info', bg: 'bg-success-container', isPerformanceLogo: true },
      { icon: 'warning', label: 'At Risk Students', value: overviewData.atRiskCount, color: 'text-error', bg: 'bg-error-container' },
    ];
  }, [overviewData]);

  const gradeBest = useMemo(() => {
    if (!gradeData || gradeData.length === 0) return null;
    return [...gradeData].sort((a, b) => (b.averageScore ?? b.rawAverage ?? 0) - (a.averageScore ?? a.rawAverage ?? 0))[0];
  }, [gradeData]);

  const classBest = useMemo(() => {
    if (!classData || classData.length === 0) return null;
    return [...classData].sort((a, b) => (b.averageScore ?? b.rawAverage ?? 0) - (a.averageScore ?? a.rawAverage ?? 0))[0];
  }, [classData]);

  const studentBest = useMemo(() => {
    if (!studentData || studentData.length === 0) return null;
    return [...studentData].sort((a, b) => (b.averageScore ?? b.rawAverage ?? 0) - (a.averageScore ?? a.rawAverage ?? 0))[0];
  }, [studentData]);

  return (
    <>
      <SEOHead title="School Analytics" description="School-wide performance comparison and analytics" />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">School Analytics</h1>
            <p className="text-body-md text-muted-foreground mt-1">Comparison panels and performance insights</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 bg-muted/20">
            <Icon name="verified" size={18} className="text-primary" />
            <span className="text-label-sm font-semibold">Genesis</span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full overflow-x-auto inline-flex">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="grades">Grade Comparison</TabsTrigger>
            <TabsTrigger value="teachers">Teacher Comparison</TabsTrigger>
            <TabsTrigger value="classes">Class Ranking</TabsTrigger>
            <TabsTrigger value="students">Student Ranking</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <DataFetchWrapper
              data={dataMap[activeTab as keyof typeof dataMap]}
              isLoading={loadingMap[activeTab as keyof typeof loadingMap]}
              error={errorMap[activeTab as keyof typeof errorMap] ? new Error('Failed to load') : null}
              onRetry={() => refetchMap[activeTab as keyof typeof refetchMap]()}
              loadingType="card"
            >
              {() => (
                <div className="space-y-6">
                  {activeTab === 'overview' && overviewData && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {statCards.map((s) => (
                          <Card key={s.label} className="border-border/60">
                            <CardContent className="p-5">
                              {s.isPerformanceLogo ? (
                                <PerformanceLogoBadge className={s.bg} />
                              ) : (
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${s.bg}`}>
                                  <Icon name={s.icon} size={22} className={s.color} />
                                </div>
                              )}
                              <p className="text-display-xs font-bold tracking-tight mt-4">{s.value}</p>
                              <p className="text-label-sm text-muted-foreground mt-1">{s.label}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <Card className="border-border/60">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-title-sm">School Performance Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            <div className="text-center p-4 rounded-xl bg-muted/30">
                              <p className="text-label-sm text-muted-foreground">Total Grades Recorded</p>
                              <p className="text-display-xs font-bold mt-1">{overviewData.totalGrades}</p>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-muted/30">
                              <p className="text-label-sm text-muted-foreground">Average Performance</p>
                               <p className="text-display-xs font-bold mt-1 text-primary">{overviewData.averagePerformance ?? 0}%</p>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-muted/30">
                              <p className="text-label-sm text-muted-foreground">At-Risk Students</p>
                              <p className="text-display-xs font-bold mt-1 text-error">{overviewData.atRiskCount}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}

                  {activeTab === 'grades' && gradeData && (
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-title-sm">Grade vs Grade Performance Comparison</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {gradeData.length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">No grade data available</p>
                        ) : (
                          <>
                            <BarChart data={gradeData as any} labelKey="grade" valueKey="averageScore" color="bg-primary" />
                            {gradeBest && (
                              <div className="mt-4 rounded-xl bg-muted/30 p-4 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary-container">
                                  <Icon name="emoji_events" size={20} className="text-primary" />
                                </div>
                                <div>
                                  <p className="text-label-xs text-muted-foreground">Best Performing Grade</p>
                                  <p className="text-title-sm font-bold">{gradeBest.grade}
                                    <span className="text-muted-foreground font-normal"> · {gradeBest.averageScore ?? gradeBest.rawAverage ?? 0}% avg, {gradeBest.examCount ?? 0} exams</span>
                                  </p>
                                </div>
                              </div>
                            )}
                            <div className="rounded-xl border border-border/60 overflow-x-auto">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="border-b border-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                                    <th className="px-4 py-3">Rank</th>
                                    <th className="px-4 py-3">Grade</th>
                                    <th className="px-4 py-3 text-right">Avg Score</th>
                                    <th className="px-4 py-3 text-right">Exams</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">Students</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40 text-title-sm">
                                  {gradeData.map((g) => (
                                    <tr key={g.grade} className="hover:bg-muted/20 transition-colors">
                                      <td className="px-4 py-3"><RankChip rank={g.rank ?? 0} /></td>
                                      <td className="px-4 py-3 font-semibold whitespace-nowrap">{g.grade}</td>
                                      <td className="px-4 py-3 text-right font-mono font-bold">{g.averageScore ?? g.rawAverage ?? 0}%</td>
                                      <td className="px-4 py-3 text-right text-muted-foreground">{g.examCount ?? 0}</td>
                                      <td className="px-4 py-3 text-right text-muted-foreground">{g.studentCount}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === 'teachers' && teacherData && (
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-title-sm">Teacher vs Teacher Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {teacherData.length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">No teacher data available</p>
                        ) : (
                          <>
                            <BarChart data={teacherData as any} labelKey="teacherName" valueKey="averageScore" color="bg-secondary" />
                            <div className="rounded-xl border border-border/60 overflow-x-auto">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="border-b border-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                                    <th className="px-4 py-3">Rank</th>
                                    <th className="px-4 py-3">Teacher</th>
                                    <th className="px-4 py-3 text-right">Avg Score</th>
                                    <th className="px-4 py-3 text-right">Exams</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">Classes</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">Students</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40 text-title-sm">
                                {teacherData.map((t) => (
                                  <tr key={t.teacherId} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3"><RankChip rank={t.rank ?? 0} /></td>
                                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{t.teacherName}</td>
                                    <td className="px-4 py-3 text-right font-mono font-bold">{t.averageScore ?? t.rawAverage ?? 0}%</td>
                                    <td className="px-4 py-3 text-right text-muted-foreground">{t.examCount ?? 0}</td>
                                    <td className="px-4 py-3 text-right text-muted-foreground">{t.classCount ?? 0}</td>
                                    <td className="px-4 py-3 text-right text-muted-foreground">{t.studentCount ?? 0}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === 'classes' && classData && (
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-title-sm">Class Performance Ranking</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {classData.length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">No class data available</p>
                        ) : (
                          <>
                            {classBest && (
                              <div className="mb-4 rounded-xl bg-muted/30 p-4 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-warning-container">
                                  <Icon name="emoji_events" size={20} className="text-warning" />
                                </div>
                                <div>
                                  <p className="text-label-xs text-muted-foreground">Best Performing Class</p>
                                  <p className="text-title-sm font-bold">{classBest.className}
                                    <span className="text-muted-foreground font-normal"> · {classBest.averageScore ?? classBest.rawAverage ?? 0}% avg, {classBest.examCount ?? 0} exams</span>
                                  </p>
                                </div>
                              </div>
                            )}
                            <div className="rounded-xl border border-border/60 overflow-x-auto">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="border-b border-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                                    <th className="px-4 py-3">Rank</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Class</th>
                                    <th className="px-4 py-3">Grade</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">Avg Score</th>
                                    <th className="px-4 py-3 text-right">Exams</th>
                                    <th className="px-4 py-3 text-right">Students</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40 text-title-sm">
                                  {classData.map((c, i) => (
                                    <tr key={c.classId} className="hover:bg-muted/20 transition-colors">
                                      <td className="px-4 py-3">
                                        <RankChip rank={c.rank ?? i + 1} />
                                      </td>
                                      <td className="px-4 py-3 font-semibold whitespace-nowrap">{c.className}</td>
                                      <td className="px-4 py-3 text-muted-foreground">{c.grade || '-'}</td>
                                      <td className="px-4 py-3 text-right font-mono font-bold">{c.averageScore ?? c.rawAverage ?? 0}%</td>
                                      <td className="px-4 py-3 text-right text-muted-foreground">{c.examCount ?? 0}</td>
                                      <td className="px-4 py-3 text-right text-muted-foreground">{c.studentCount ?? 0}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === 'students' && studentData && (
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-title-sm">Student Performance Ranking</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {studentData.length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">No student performance data available</p>
                        ) : (
                          <>
                            {studentBest && (
                              <div className="mb-4 rounded-xl bg-muted/30 p-4 flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary-container">
                                  <Icon name="emoji_events" size={20} className="text-primary" />
                                </div>
                                <div>
                                  <p className="text-label-xs text-muted-foreground">Best Performing Student</p>
                                  <p className="text-title-sm font-bold">{studentBest.studentName}
                                    <span className="text-muted-foreground font-normal"> · {studentBest.averageScore ?? studentBest.rawAverage ?? 0}% avg, {studentBest.examCount ?? 0} exams</span>
                                  </p>
                                </div>
                              </div>
                            )}
                            <div className="rounded-xl border border-border/60 overflow-x-auto">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="border-b border-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                                    <th className="px-4 py-3">Rank</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Student</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Class</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">Avg Score</th>
                                    <th className="px-4 py-3 text-right">Exams</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40 text-title-sm">
                                  {studentData.map((s, i) => (
                                    <tr key={s.studentId} className="hover:bg-muted/20 transition-colors">
                                      <td className="px-4 py-3">
                                        <RankChip rank={s.rank ?? i + 1} />
                                      </td>
                                      <td className="px-4 py-3 font-semibold whitespace-nowrap">{s.studentName}</td>
                                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{s.className || '-'}{s.grade ? ` (${s.grade})` : ''}</td>
                                      <td className="px-4 py-3 text-right font-mono font-bold">{s.averageScore ?? s.rawAverage ?? 0}%</td>
                                      <td className="px-4 py-3 text-right text-muted-foreground">{s.examCount ?? 0}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {activeTab === 'trends' && trendData && (
                    <Card className="border-border/60">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-title-sm">Performance Trends Over Time</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {trendData.length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">No trend data available</p>
                        ) : (
                          <div className="space-y-3">
                            {(() => {
                              return trendData.map((t) => {
                                const date = new Date(t.month + '-02T00:00:00');
                                const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                                const pct = t.averageScore;
                                return (
                                  <div
                                    key={t.month}
                                    className="flex items-center gap-3"
                                  >
                                    <span className="text-label-sm font-medium w-24 shrink-0 text-right">{label}</span>
                                    <div className="flex-1 h-7 rounded-full bg-muted/40 overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-primary flex items-center justify-end pr-2 text-[11px] text-white font-bold"
                                        style={{ width: `${Math.min(Math.max(pct, pct > 0 ? 6 : 0), 100)}%` }}
                                      >
                                        {pct}%
                                      </div>
                                    </div>
                                    <span className="text-label-xs text-muted-foreground w-16 shrink-0">{t.count} records</span>
                                  </div>
                                );
                              });
                            })()}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-border/40">
                              {(() => {
                                const total = trendData.reduce((s, t) => s + t.count, 0);
                                const avg = trendData.length > 0
                                  ? Math.round(trendData.reduce((s, t) => s + t.averageScore, 0) / trendData.length)
                                  : 0;
                                const best = trendData.reduce((a, b) => (a.averageScore > b.averageScore ? a : b), trendData[0]);
                                const date = new Date(best.month + '-02T00:00:00');
                                const bestLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                                return (
                                  <>
                                    <div className="rounded-xl bg-muted/30 p-4 text-center">
                                      <p className="text-label-sm text-muted-foreground">Overall Avg</p>
                                      <p className="text-display-xs font-bold mt-1 text-primary">{avg}%</p>
                                    </div>
                                    <div className="rounded-xl bg-muted/30 p-4 text-center">
                                      <p className="text-label-sm text-muted-foreground">Total Records</p>
                                      <p className="text-display-xs font-bold mt-1">{total}</p>
                                    </div>
                                    <div className="rounded-xl bg-muted/30 p-4 text-center">
                                      <p className="text-label-sm text-muted-foreground">Best Month</p>
                                      <p className="text-display-xs font-bold mt-1 text-success">{best.averageScore}%</p>
                                      <p className="text-label-xs text-muted-foreground mt-0.5">{bestLabel}</p>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </DataFetchWrapper>
          </div>
        </Tabs>
      </div>
    </>
  );
}
