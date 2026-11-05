import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/Icon';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { schoolAnalyticsService } from '@/services/schoolAnalyticsService';

function BarChart({ data, labelKey, valueKey, color = 'bg-primary', maxValue }: { data: Record<string, number | string>[]; labelKey: string; valueKey: string; color?: string; maxValue?: number }) {
  const max = maxValue || Math.max(...data.map((d) => Number(d[valueKey])), 1);
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-2 sm:gap-3">
          <span className="text-label-xs sm:text-label-sm font-medium w-20 sm:w-32 truncate shrink-0 text-right">{item[labelKey]}</span>
          <div className="flex-1 h-6 rounded-full bg-muted/40 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(Number(item[valueKey]) / max) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
              className={`h-full rounded-full ${color} flex items-center justify-end pr-2 text-[10px] text-white font-bold`}
              style={{ minWidth: Number(item[valueKey]) > 0 ? '2rem' : '0' }}
            >
              {item[valueKey]}%
            </motion.div>
          </div>
        </div>
      ))}
    </div>
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

  const { data: trendData, isLoading: trendLoading, isError: trendError, refetch: refetchTrends } = useQuery({
    queryKey: ['school-analytics-trends'],
    queryFn: () => schoolAnalyticsService.getPerformanceTrends().then((r) => r.data),
    enabled: activeTab === 'trends',
  });

  const dataMap = { overview: overviewData, grades: gradeData, teachers: teacherData, classes: classData, trends: trendData } as const;
  const loadingMap = { overview: overviewLoading, grades: gradeLoading, teachers: teacherLoading, classes: classLoading, trends: trendLoading } as const;
  const errorMap = { overview: overviewError, grades: gradeError, teachers: teacherError, classes: classError, trends: trendError } as const;
  const refetchMap = { overview: refetchOverview, grades: refetchGrade, teachers: refetchTeacher, classes: refetchClass, trends: refetchTrends } as const;

  const statCards = useMemo(() => {
    if (!overviewData) return [];
    return [
      { icon: 'groups', label: 'Total Students', value: overviewData.totalStudents, color: 'text-primary', bg: 'bg-primary-container' },
      { icon: 'badge', label: 'Total Teachers', value: overviewData.totalTeachers, color: 'text-success', bg: 'bg-success-container' },
      { icon: 'meeting_room', label: 'Total Classes', value: overviewData.totalClasses, color: 'text-warning', bg: 'bg-warning-container' },
      { icon: 'trending_up', label: 'Avg Performance', value: `${overviewData.averagePerformance}%`, color: 'text-info', bg: 'bg-info-container' },
      { icon: 'warning', label: 'At Risk Students', value: overviewData.atRiskCount, color: 'text-error', bg: 'bg-error-container' },
    ];
  }, [overviewData]);

  return (
    <>
      <SEOHead title="School Analytics" description="School-wide performance comparison and analytics" />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">School Analytics</h1>
          <p className="text-body-md text-muted-foreground mt-1">Comparison panels and performance insights</p>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full overflow-x-auto inline-flex">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="grades">Grade Comparison</TabsTrigger>
            <TabsTrigger value="teachers">Teacher Comparison</TabsTrigger>
            <TabsTrigger value="classes">Class Ranking</TabsTrigger>
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
                              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${s.bg}`}>
                                <Icon name={s.icon} size={22} className={s.color} />
                              </div>
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
                          <BarChart data={gradeData as any} labelKey="grade" valueKey="averageScore" color="bg-primary" />
                        )}
                        {gradeData.length > 0 && (
                          <div className="mt-6 border-t border-border/40 pt-4">
                            <table className="w-full text-left text-title-sm">
                              <thead>
                                <tr className="text-label-sm text-muted-foreground uppercase tracking-wider">
                                  <th className="pb-2 font-bold">Grade</th>
                                  <th className="pb-2 font-bold">Avg Score</th>
                                  <th className="pb-2 font-bold">Students</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/40">
                                {gradeData.map((g) => (
                                  <tr key={g.grade} className="hover:bg-muted/20">
                                    <td className="py-2 font-semibold">{g.grade}</td>
                                    <td className="py-2 font-mono">{g.averageScore ?? 0}%</td>
                                    <td className="py-2 text-muted-foreground">{g.studentCount}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
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
                          <BarChart data={teacherData as any} labelKey="teacherName" valueKey="averageScore" color="bg-secondary" />
                        )}
                        {teacherData.length > 0 && (
                          <div className="mt-6 border-t border-border/40 pt-4">
                            <table className="w-full text-left text-title-sm">
                              <thead>
                                <tr className="text-label-sm text-muted-foreground uppercase tracking-wider">
                                  <th className="pb-2 font-bold">Teacher</th>
                                  <th className="pb-2 font-bold">Avg Score</th>
                                  <th className="pb-2 font-bold">Classes</th>
                                  <th className="pb-2 font-bold">Students</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/40">
                                {teacherData.map((t) => (
                                  <tr key={t.teacherId} className="hover:bg-muted/20">
                                    <td className="py-2 font-semibold">{t.teacherName}</td>
                                    <td className="py-2 font-mono">{t.averageScore ?? 0}%</td>
                                    <td className="py-2 text-muted-foreground">{t.classCount ?? 0}</td>
                                    <td className="py-2 text-muted-foreground">{t.studentCount ?? 0}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
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
                          <div className="border border-border/60 rounded-xl overflow-x-auto">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                                  <th className="px-4 py-3">Rank</th>
                                  <th className="px-4 py-3">Class</th>
                                  <th className="px-4 py-3">Grade</th>
                                  <th className="px-4 py-3 text-right">Avg Score</th>
                                  <th className="px-4 py-3 text-right">Students</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/40 text-title-sm">
                                {classData.map((c, i) => (
                                  <tr key={c.classId} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                        i === 0 ? 'bg-warning-container text-warning' :
                                        i === 1 ? 'bg-muted text-muted-foreground' :
                                        i === 2 ? 'bg-error-container/40 text-error' :
                                        'bg-muted/30 text-muted-foreground'
                                      }`}>
                                        {i + 1}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 font-semibold">{c.className}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{c.grade || '-'}</td>
                                    <td className="px-4 py-3 text-right font-mono font-bold">{c.averageScore ?? 0}%</td>
                                    <td className="px-4 py-3 text-right text-muted-foreground">{c.studentCount ?? 0}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
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
                          <div className="space-y-4">
                            <div className="flex items-end gap-1 sm:gap-2 h-32 sm:h-48 overflow-x-auto pb-2">
                              {trendData.map((t, i) => {
                                const maxVal = Math.max(...trendData.map((x) => x.averageScore), 1);
                                const height = (t.averageScore / maxVal) * 100;
                                return (
                                  <div key={t.month} className="flex-1 flex flex-col items-center gap-1 min-w-[32px]">
                                    <span className="text-[9px] sm:text-[10px] font-mono text-muted-foreground">{t.averageScore ?? 0}%</span>
                                    <motion.div
                                      initial={{ height: 0 }}
                                      animate={{ height: `${height}%` }}
                                      transition={{ duration: 0.5, delay: i * 0.05 }}
                                      className="w-full rounded-t-md bg-primary"
                                    />
                                    <span className="text-[9px] sm:text-[10px] text-muted-foreground sm:rotate-45 sm:origin-left whitespace-nowrap">
                                      {(t.month ?? '').slice(5)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="border-t border-border/40 pt-4">
                              <table className="w-full text-left text-title-sm">
                                <thead>
                                  <tr className="text-label-sm text-muted-foreground uppercase tracking-wider">
                                    <th className="pb-2 font-bold">Month</th>
                                    <th className="pb-2 font-bold">Avg Score</th>
                                    <th className="pb-2 font-bold">Records</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                  {trendData.map((t) => (
                                    <tr key={t.month} className="hover:bg-muted/20">
                                      <td className="py-2 font-semibold">{t.month}</td>
                                      <td className="py-2 font-mono">{t.averageScore ?? 0}%</td>
                                      <td className="py-2 text-muted-foreground">{t.count ?? 0}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
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
