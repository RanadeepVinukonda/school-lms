import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { OptionsSelect } from '@/components/ui/select';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { getAllUsers, getAllClasses, getAllGrades } from '@/services/dataService';
import { analyticsService } from '@/services/analyticsService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/config';

interface ExamDoc {
  id: string;
  title: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

interface AssignmentDoc {
  id: string;
  title: string;
  dueDate?: string;
  createdAt?: string;
}

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'oversight'>('overview');
  const [oversightSearch, setOversightSearch] = useState('');
  const [oversightStatusFilter, setOversightStatusFilter] = useState('all');

  // Overview Query
  const { data: overviewData, isLoading: isOverviewLoading, isError: isOverviewError, refetch: refetchOverview } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const [users, classes, grades, examsSnap, assignmentsSnap] = await Promise.all([
        getAllUsers(),
        getAllClasses(),
        getAllGrades(),
        getDocs(collection(db, 'exams')),
        getDocs(collection(db, 'assignments')),
      ]);

      const exams: ExamDoc[] = examsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ExamDoc));
      const assignments: AssignmentDoc[] = assignmentsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AssignmentDoc));

      const studentCount = users.filter((u) => u.role === 'student').length;
      const teacherCount = users.filter((u) => u.role === 'teacher').length;
      const upcomingExamCount = exams.filter((e) => e.startDate && new Date(e.startDate) > new Date()).length;

      const atRiskStudents = grades
        .filter((g) => g.percentage < 70)
        .map((g) => ({
          id: g.id,
          studentName: users.find((u) => u.id === g.studentId)?.displayName ?? 'Unknown',
          percentage: g.percentage,
          subject: g.itemName ?? '',
        }));

      const workloadMap = new Map<string, number>();
      for (const cls of classes) {
        if (cls.teacherIds) {
          for (const tid of cls.teacherIds) {
            workloadMap.set(tid, (workloadMap.get(tid) ?? 0) + 1);
          }
        }
      }
      const teacherWorkload = Array.from(workloadMap.entries()).map(([id, count]) => ({
        name: users.find((u) => u.id === id)?.displayName ?? 'Unknown',
        classCount: count,
      }));

      const feed: Array<{ id: string; title: string; desc: string; ts: string }> = [];
      for (const exam of exams) {
        feed.push({ id: `e-${exam.id}`, title: 'New Exam Created', desc: exam.title, ts: exam.endDate ?? exam.createdAt ?? '' });
      }
      for (const a of assignments) {
        feed.push({ id: `a-${a.id}`, title: 'New Assignment Posted', desc: a.title, ts: a.dueDate ?? a.createdAt ?? '' });
      }
      for (const g of grades) {
        const s = users.find((u) => u.id === g.studentId);
        feed.push({
          id: `g-${g.id}`,
          title: 'Grade Submitted',
          desc: `${s?.displayName ?? 'Unknown'} \u2014 ${g.itemName ?? ''}: ${g.score}/${g.totalPoints}`,
          ts: g.createdAt,
        });
      }
      feed.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

      return { studentCount, teacherCount, classCount: classes.length, upcomingExamCount, atRiskStudents, teacherWorkload, activityFeed: feed.slice(0, 8) };
    },
  });

  // Oversight Query
  const { data: oversightData = [], isLoading: isOversightLoading, isError: isOversightError, refetch: refetchOversight } = useQuery({
    queryKey: ['admin-concept-oversight'],
    queryFn: () => analyticsService.getConceptOversight(),
    enabled: activeTab === 'oversight',
  });

  const reTeachMutation = useMutation({
    mutationFn: (data: { teacherId: string; className: string; subjectName: string; conceptName: string }) =>
      analyticsService.requestReTeach(data),
    onSuccess: () => {
      toast.success('Re-teach notification sent to teacher');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to send notification');
    },
  });

  const filteredOversight = useMemo(() => {
    return oversightData.filter((item: any) => {
      const q = oversightSearch.toLowerCase();
      const matchesSearch =
        item.className.toLowerCase().includes(q) ||
        item.subjectName.toLowerCase().includes(q) ||
        item.conceptName.toLowerCase().includes(q) ||
        item.teacherName.toLowerCase().includes(q);

      const matchesStatus =
        oversightStatusFilter === 'all' ||
        (oversightStatusFilter === 'low' && item.status === 'low') ||
        (oversightStatusFilter === 'normal' && item.status === 'normal');

      return matchesSearch && matchesStatus;
    });
  }, [oversightData, oversightSearch, oversightStatusFilter]);

  const statCards = useMemo(() => [
    { icon: 'groups', label: 'Total Students', value: overviewData?.studentCount ?? 0, color: 'text-primary', bg: 'bg-primary-container' },
    { icon: 'badge', label: 'Total Teachers', value: overviewData?.teacherCount ?? 0, color: 'text-success', bg: 'bg-success-container' },
    { icon: 'meeting_room', label: 'Active Classes', value: overviewData?.classCount ?? 0, color: 'text-warning', bg: 'bg-warning-container' },
    { icon: 'calendar_month', label: 'Upcoming Exams', value: overviewData?.upcomingExamCount ?? 0, color: 'text-error', bg: 'bg-error-container' },
  ], [overviewData]);

  const isTabLoading = activeTab === 'overview' ? isOverviewLoading : isOversightLoading;
  const isTabError = activeTab === 'overview' ? isOverviewError : isOversightError;
  const tabRefetch = activeTab === 'overview' ? refetchOverview : refetchOversight;

  return (
    <>
      <SEOHead title="School Health Dashboard" description="Actionable insights and school health metrics" canonical="/admin/dashboard" />
      
      <div className="space-y-6">
        {/* Header and Tab Toggles */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-headline-sm">School Dashboard</h1>
            <p className="text-sm text-on-surface-variant">Actionable oversight and analytics for principal administrators</p>
          </div>
          <div className="flex gap-2 bg-surface-variant/40 p-1.5 rounded-lg border border-outline-variant">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon name="dashboard" size={16} />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('oversight')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === 'oversight'
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon name="flag" size={16} />
              Concept Oversight
              {oversightData.some((x: any) => x.status === 'low') && (
                <span className="h-2 w-2 rounded-full bg-error" />
              )}
            </button>
          </div>
        </div>

        <DataFetchWrapper
          data={activeTab === 'overview' ? overviewData : oversightData}
          isLoading={isTabLoading}
          error={isTabError ? new Error('Failed to load dashboard data') : null}
          onRetry={() => tabRefetch()}
          loadingType="card"
        >
          {() => (
            <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit">
              {activeTab === 'overview' ? (
                /* OVERVIEW TAB CONTENT */
                <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
                  <motion.div variants={listItem} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map((s) => (
                      <Card key={s.label} variant="elevated">
                        <CardContent className="p-5">
                          <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${s.bg}`}>
                            <Icon name={s.icon} size={22} className={s.color} />
                          </div>
                          <p className="text-2xl font-bold tracking-tight mt-3">{s.value}</p>
                          <p className="text-xs text-on-surface-variant mt-0.5">{s.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </motion.div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <motion.div variants={listItem}>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-title-md flex items-center gap-2">
                            <Icon name="warning" size={18} className="text-error" />
                            At-Risk Students
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {overviewData?.atRiskStudents?.length === 0 ? (
                            <div className="flex flex-col items-center py-8 text-on-surface-variant">
                              <Icon name="trending_up" size={36} />
                              <p className="text-sm mt-2">All students performing well</p>
                              <p className="text-xs">No grades below 70% threshold</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {overviewData?.atRiskStudents?.map((s: any) => (
                                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-error-container/30 border border-error/20">
                                  <div>
                                    <p className="text-sm font-medium">{s.studentName}</p>
                                    <p className="text-xs text-on-surface-variant">{s.subject}</p>
                                  </div>
                                  <span className="text-sm font-bold text-error">{s.percentage}%</span>
                                </div>
                              ))}
                              <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                                <Link to="/admin/students">View All Students</Link>
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>

                    <motion.div variants={listItem}>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-title-md flex items-center gap-2">
                            <Icon name="badge" size={18} className="text-on-surface-variant" />
                            Teacher Workload
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {overviewData?.teacherWorkload?.length === 0 ? (
                            <div className="flex flex-col items-center py-8 text-on-surface-variant">
                              <Icon name="badge" size={36} />
                              <p className="text-sm mt-2">No teachers assigned</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {overviewData?.teacherWorkload?.map((t: any) => (
                                <div key={t.name} className="flex items-center justify-between p-3 rounded-lg bg-surface-variant/50">
                                  <span className="text-sm font-medium">{t.name}</span>
                                  <span className="text-sm text-on-surface-variant">{t.classCount} {t.classCount === 1 ? 'class' : 'classes'}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </div>

                  <motion.div variants={listItem}>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-title-md flex items-center gap-2">
                          <Icon name="history" size={18} className="text-on-surface-variant" />
                          Recent Activity
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {overviewData?.activityFeed?.length === 0 ? (
                          <div className="flex flex-col items-center py-8 text-on-surface-variant">
                            <Icon name="history" size={36} />
                            <p className="text-sm mt-2">No recent activity</p>
                          </div>
                        ) : (
                          <div className="relative pl-6 border-l-2 border-surface-variant space-y-4">
                            {overviewData?.activityFeed?.map((item: any) => (
                              <div key={item.id} className="relative">
                                <div className="absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-surface" />
                                <p className="text-sm font-medium">{item.title}</p>
                                <p className="text-xs text-on-surface-variant">{item.desc}</p>
                                <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
                                  {new Date(item.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              ) : (
                /* CONCEPT OVERSIGHT TAB CONTENT */
                <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-6">
                  {/* Search and Filters */}
                  <motion.div variants={listItem} className="flex gap-3 items-center flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                      <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                      <Input
                        placeholder="Search concept oversight..."
                        className="pl-10"
                        value={oversightSearch}
                        onChange={(e) => setOversightSearch(e.target.value)}
                      />
                    </div>
                    <OptionsSelect
                      options={[
                        { value: 'all', label: 'All Concepts' },
                        { value: 'low', label: 'Low Mastery (Alert)' },
                        { value: 'normal', label: 'Normal Mastery' },
                      ]}
                      value={oversightStatusFilter}
                      onChange={(v: string) => setOversightStatusFilter(v)}
                      className="w-48"
                    />
                  </motion.div>

                  {/* Oversight Table */}
                  <motion.div variants={listItem}>
                    {filteredOversight.length === 0 ? (
                      <Card>
                        <CardContent className="flex flex-col items-center gap-4 py-16 text-on-surface-variant">
                          <Icon name="search_off" size={48} className="opacity-50" />
                          <p className="font-medium">No concepts match your criteria</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="border border-outline-variant rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-b-outline-variant bg-surface-variant/30 text-label-sm font-medium text-on-surface-variant uppercase tracking-wider">
                              <th className="text-left px-4 py-3">Class / Subject</th>
                              <th className="text-left px-4 py-3">Concept</th>
                              <th className="text-left px-4 py-3">Teacher</th>
                              <th className="text-left px-4 py-3">Average Score</th>
                              <th className="text-left px-4 py-3">Attempts</th>
                              <th className="text-center px-4 py-3">Status</th>
                              <th className="text-right px-4 py-3">Oversight Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant">
                            {filteredOversight.map((item: any, idx: number) => {
                              const isLow = item.status === 'low';
                              return (
                                <tr key={`${item.classId}-${item.conceptId}-${idx}`} className="hover:bg-surface-variant/20 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="font-semibold text-body-md">{item.className}</div>
                                    <div className="text-xs text-on-surface-variant">{item.subjectName}</div>
                                  </td>
                                  <td className="px-4 py-3 text-body-md font-medium max-w-[200px] truncate" title={item.conceptName}>
                                    {item.conceptName}
                                  </td>
                                  <td className="px-4 py-3 text-body-md text-on-surface-variant">{item.teacherName}</td>
                                  <td className="px-4 py-3 font-mono">
                                    {item.attemptCount > 0 ? (
                                      <span className={isLow ? 'text-error font-bold' : 'text-success font-semibold'}>
                                        {item.averageScore}%
                                      </span>
                                    ) : (
                                      <span className="text-on-surface-variant/40">\u2014</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-body-md font-mono text-on-surface-variant">{item.attemptCount}</td>
                                  <td className="px-4 py-3 text-center">
                                    {item.attemptCount > 0 ? (
                                      <Badge variant={isLow ? 'destructive' : 'success'} className="text-[10px] uppercase font-bold">
                                        {isLow ? 'Alert' : 'Good'}
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-[10px] uppercase font-bold">
                                        Untested
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <Button
                                      size="sm"
                                      variant={isLow ? 'destructive' : 'outline'}
                                      disabled={!isLow || reTeachMutation.isPending}
                                      onClick={() =>
                                        reTeachMutation.mutate({
                                          teacherId: item.teacherId,
                                          className: item.className,
                                          subjectName: item.subjectName,
                                          conceptName: item.conceptName,
                                        })
                                      }
                                    >
                                      <Icon name="campaign" size={16} className="mr-1.5" />
                                      Request Re-teach
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}
        </DataFetchWrapper>
      </div>
    </>
  );
}
