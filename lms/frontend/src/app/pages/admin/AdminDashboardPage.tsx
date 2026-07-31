import { useState, useMemo, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { motion, useInView } from 'framer-motion';
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
import { staggerContainer, cardStackReveal } from '@/lib/motion';
import { supabase } from '@/supabase/config';
import { getAllUsers, getAllClasses, getAllGrades, getAllExams, getAllAssignments } from '@/services/dataService';
import { analyticsService } from '@/services/analyticsService';
import { teacherClassSubjectService, type TeacherClassSubject } from '@/services/teacherClassSubjectService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

interface ExamDoc { id: string; title: string; startDate?: string; endDate?: string; createdAt?: string; }
interface AssignmentDoc { id: string; title: string; dueDate?: string; createdAt?: string; }

function SectionTitle({ label, title }: { label: string; title: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.05, 0, 0.133333, 0.06] }}
      className="mb-6"
    >
      <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-2">{label}</p>
      <h2 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{title}</h2>
    </motion.div>
  );
}

export default function AdminDashboardPage() {
  const { _ } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'oversight' | 'tests_monitor' | 'monitor'>('overview');
  const [oversightSearch, setOversightSearch] = useState('');
  const [oversightStatusFilter, setOversightStatusFilter] = useState('all');
  const [testsSearch, setTestsSearch] = useState('');
  const [testsTypeFilter, setTestsTypeFilter] = useState('all');
  const [inspectTest, setInspectTest] = useState<any | null>(null);

  const { data: conductedTestsData = [], isLoading: isTestsLoading, isError: isTestsError, refetch: refetchTests } = useQuery({
    queryKey: ['admin-conducted-tests'],
    queryFn: () => analyticsService.getConductedTests(),
    enabled: activeTab === 'tests_monitor',
  });

  const { data: inspectDetails, isLoading: isInspectLoading } = useQuery({
    queryKey: ['admin-test-details', inspectTest?.id, inspectTest?.type],
    queryFn: () => {
      if (!inspectTest) return null;
      return analyticsService.getAssessmentAnalytics(inspectTest.id, inspectTest.type.toLowerCase() as 'quiz' | 'exam' | 'assignment');
    },
    enabled: !!inspectTest,
  });

  const filteredTests = useMemo(() => {
    return conductedTestsData.filter((item: any) => {
      const q = testsSearch.toLowerCase();
      const matchesSearch =
        item.title.toLowerCase().includes(q) ||
        item.className.toLowerCase().includes(q) ||
        item.subjectName.toLowerCase().includes(q) ||
        item.teacherName.toLowerCase().includes(q) ||
        (item.conceptName && item.conceptName.toLowerCase().includes(q));
      const matchesType = testsTypeFilter === 'all' || item.type.toLowerCase() === testsTypeFilter.toLowerCase();
      return matchesSearch && matchesType;
    });
  }, [conductedTestsData, testsSearch, testsTypeFilter]);

  const { data: overviewData, isLoading: isOverviewLoading, isError: isOverviewError, refetch: refetchOverview } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const [users, classes, grades, examsRaw, assignmentsRaw, tcsList, quizAttempts, examAttempts, submissionAttempts] = await Promise.all([
        getAllUsers(), getAllClasses(), getAllGrades(),
        getAllExams(), getAllAssignments(),
        teacherClassSubjectService.getAll().catch(() => ({ data: [] as TeacherClassSubject[] })),
        supabase.from('firestore_docs').select('data').eq('collection', 'quizAttemptV2').then(r => r.data || []),
        supabase.from('firestore_docs').select('data').eq('collection', 'examAttemptV2').then(r => r.data || []),
        supabase.from('firestore_docs').select('data').eq('collection', 'assignmentSubmissionV2').then(r => r.data || []),
      ]);

      const exams: ExamDoc[] = ((examsRaw || []) as unknown) as ExamDoc[];
      const assignments: AssignmentDoc[] = ((assignmentsRaw || []) as unknown) as AssignmentDoc[];

      const studentCount = users.filter((u) => u.role === 'student').length;
      const teacherCount = users.filter((u) => u.role === 'teacher').length;
      const upcomingExamCount = exams.filter((e) => e.startDate && new Date(e.startDate) > new Date()).length;

      // At-risk from actual attempt data stored in firestore_docs
      const attemptScores = new Map<string, { total: number; count: number; itemName: string }>();
      for (const arr of [quizAttempts, examAttempts, submissionAttempts]) {
        for (const a of arr) {
          const pct = (a.data as any)?.percentage;
          const sid = (a.data as any)?.studentId;
          const item = (a.data as any)?.itemName || (a.data as any)?.title || 'Unknown';
          if (pct == null || !sid) continue;
          const existing = attemptScores.get(sid) || { total: 0, count: 0, itemName: item };
          existing.total += pct;
          existing.count++;
          existing.itemName = item;
          attemptScores.set(sid, existing);
        }
      }
      const atRiskStudents = Array.from(attemptScores.entries())
        .filter(([_, s]) => s.count > 0 && (s.total / s.count) < 50)
        .map(([sid, s]) => ({
          id: sid,
          studentName: users.find((u) => u.id === sid)?.displayName ?? 'Unknown',
          percentage: Math.round(s.total / s.count),
          subject: s.itemName,
        }));

      // Teacher workload: count distinct classes per teacher from teacherClassSubject
      const workloadMap = new Map<string, number>();
      for (const tcs of (tcsList.data || [])) {
        const tid = (tcs as any).teacherId || (tcs as any).teacher_id;
        if (tid) workloadMap.set(tid, (workloadMap.get(tid) ?? 0) + 1);
      }
      const teacherWorkload = Array.from(workloadMap.entries()).map(([id, count]) => ({
        name: users.find((u) => u.id === id)?.displayName ?? 'Unknown', classCount: count,
      }));

      const feed: Array<{ id: string; title: string; desc: string; ts: string }> = [];
      for (const exam of exams) { feed.push({ id: `e-${exam.id}`, title: 'New Exam Created', desc: exam.title, ts: exam.endDate ?? exam.createdAt ?? '' }); }
      for (const a of assignments) { feed.push({ id: `a-${a.id}`, title: 'New Assignment Posted', desc: a.title, ts: a.dueDate ?? a.createdAt ?? '' }); }
      for (const g of grades) {
        const s = users.find((u) => u.id === g.studentId);
        feed.push({ id: `g-${g.id}`, title: 'Grade Submitted', desc: `${s?.displayName ?? 'Unknown'} \u2014 ${g.itemName ?? ''}: ${g.score}/${g.totalPoints}`, ts: g.createdAt });
      }
      feed.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

      return { studentCount, teacherCount, classCount: classes.length, upcomingExamCount, atRiskStudents, teacherWorkload, activityFeed: feed.slice(0, 8) };
    },
  });

  const { data: oversightData = [], isLoading: isOversightLoading, isError: isOversightError, refetch: refetchOversight } = useQuery({
    queryKey: ['admin-concept-oversight'],
    queryFn: () => analyticsService.getConceptOversight(),
    enabled: activeTab === 'oversight',
  });

  const { data: teachersData = [], isLoading: isTeachersLoading, isError: isTeachersError } = useQuery({
    queryKey: ['admin-teachers'],
    queryFn: () => getAllUsers().then((u) => u.filter((x) => x.role === 'teacher')),
    enabled: activeTab === 'monitor',
  });

  const { data: studentsData = [], isLoading: isStudentsLoading, isError: isStudentsError } = useQuery({
    queryKey: ['admin-students'],
    queryFn: () => getAllUsers().then((u) => u.filter((x) => x.role === 'student')),
    enabled: activeTab === 'monitor',
  });

  const reTeachMutation = useMutation({
    mutationFn: (data: { teacherId: string; className: string; subjectName: string; conceptName: string; section?: string; affectedStudents?: number; averageScore?: number; suggestedReason?: string }) =>
      analyticsService.requestReTeach(data),
    onSuccess: () => { toast.success('Re-teach notification sent to teacher'); },
    onError: (err: any) => { toast.error(err.message || 'Failed to send notification'); },
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
    { icon: 'groups', label: _('Total Students'), value: overviewData?.studentCount ?? 0, color: 'text-primary', bg: 'bg-primary-container' },
    { icon: 'badge', label: _('Total Teachers'), value: overviewData?.teacherCount ?? 0, color: 'text-success', bg: 'bg-success-container' },
    { icon: 'meeting_room', label: _('Active Classes'), value: overviewData?.classCount ?? 0, color: 'text-warning', bg: 'bg-warning-container' },
    { icon: 'calendar_month', label: _('Upcoming Exams'), value: overviewData?.upcomingExamCount ?? 0, color: 'text-error', bg: 'bg-error-container' },
  ], [overviewData]);

  const isTabLoading = activeTab === 'overview' ? isOverviewLoading
    : activeTab === 'oversight' ? isOversightLoading
    : activeTab === 'tests_monitor' ? isTestsLoading
    : (isTeachersLoading || isStudentsLoading);

  const isTabError = activeTab === 'overview' ? isOverviewError
    : activeTab === 'oversight' ? isOversightError
    : activeTab === 'tests_monitor' ? isTestsError
    : (isTeachersError || isStudentsError);

  const tabRefetch = activeTab === 'overview' ? refetchOverview
    : activeTab === 'oversight' ? refetchOversight
    : activeTab === 'tests_monitor' ? refetchTests
    : () => { refetchOverview(); };

  // Realtime: auto-refresh when new exams, assignments, or grades are added
  useRealtimeSubscription({
    table: 'exams',
    event: 'INSERT',
    callback: () => { queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }); },
  });
  useRealtimeSubscription({
    table: 'assignments',
    event: 'INSERT',
    callback: () => { queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }); },
  });
  useRealtimeSubscription({
    table: 'grades',
    event: 'INSERT',
    callback: () => { queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] }); },
  });

  const TABS = [
    { key: 'overview' as const, icon: 'dashboard', label: _('Overview') },
    { key: 'oversight' as const, icon: 'flag', label: _('Concept Oversight') },
    { key: 'tests_monitor' as const, icon: 'analytics', label: _('Test Monitor') },
    { key: 'monitor' as const, icon: 'monitor_heart', label: _('Full Monitor') },
  ];

  return (
    <>
      <SEOHead title="School Health Dashboard" description="Actionable insights and school health metrics" canonical="/admin/dashboard" />
      <div className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-8">
        <section>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.05, 0, 0.133333, 0.06] }}
          >
            <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">{_('School Dashboard')}</h1>
            <p className="text-body-md text-muted-foreground mt-1">{_('Actionable oversight and analytics')}</p>
          </motion.div>

          <div className="mt-6 flex gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/60 w-full sm:w-fit overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-surface text-primary shadow-sm border border-border/40'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon name={tab.icon} size={16} />
                {tab.label}
                {tab.key === 'oversight' && oversightData.some((x: any) => x.status === 'low') && (
                  <span className="h-2 w-2 rounded-full bg-error" />
                )}
              </button>
            ))}
          </div>
        </section>

        <DataFetchWrapper
          data={activeTab === 'overview' ? overviewData
            : activeTab === 'oversight' ? oversightData
            : activeTab === 'tests_monitor' ? conductedTestsData : {}}
          isLoading={isTabLoading}
          error={isTabError ? new Error('Failed to load dashboard data') : null}
          onRetry={() => tabRefetch()}
          loadingType="card"
        >
          {() => (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              key={activeTab}
            >
              {activeTab === 'overview' && (
                <div className="space-y-16">
                  <section>
                    <SectionTitle label={_('Metrics')} title={_('School-wide statistics')} />
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true, margin: '-60px' }}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                    >
                      {statCards.map((s) => (
                        <motion.div key={s.label} variants={cardStackReveal} custom={0}>
                          <Card className="border-border/60 h-full">
                            <CardContent className="p-5">
                              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${s.bg}`}>
                                <Icon name={s.icon} size={22} className={s.color} />
                              </div>
                              <p className="text-display-xs font-bold tracking-tight mt-4">{s.value}</p>
                              <p className="text-label-sm text-muted-foreground mt-1">{s.label}</p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </motion.div>
                  </section>

                  <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <SectionTitle label={_('Students')} title={_('At-risk & performance')} />
                      <motion.div variants={cardStackReveal} custom={0}>
                        <Card className="border-border/60">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-title-sm flex items-center gap-2">
                              <Icon name="warning" size={18} className="text-error" />
                              {_('At-Risk Students')}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {overviewData?.atRiskStudents?.length === 0 ? (
                              <div className="flex flex-col items-center py-10 text-muted-foreground">
                                <Icon name="trending_up" size={40} className="text-muted-foreground/30 mb-3" />
                                <p className="text-title-sm font-semibold">{_('All students performing well')}</p>
                                <p className="text-label-sm text-muted-foreground">{_('No grades below 70% threshold')}</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {overviewData?.atRiskStudents?.map((s: any) => (
                                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-error-container/30 border border-error/20">
                                    <div>
                                      <p className="text-title-sm font-semibold">{s.studentName}</p>
                                      <p className="text-label-sm text-muted-foreground">{s.subject}</p>
                                    </div>
                                    <span className="text-title-sm font-bold text-error">{s.percentage}%</span>
                                  </div>
                                ))}
                                <Button variant="outline" size="sm" className="w-full mt-3" asChild>
                                  <Link to="/admin/classes?tab=students">{_('View All Students')}</Link>
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    </div>

                    <div>
                      <SectionTitle label={_('Staff')} title={_('Teacher workload')} />
                      <motion.div variants={cardStackReveal} custom={0}>
                        <Card className="border-border/60">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-title-sm flex items-center gap-2">
                              <Icon name="badge" size={18} className="text-muted-foreground" />
                              {_('Teacher Workload')}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {overviewData?.teacherWorkload?.length === 0 ? (
                              <div className="flex flex-col items-center py-10 text-muted-foreground">
                                <Icon name="badge" size={40} className="text-muted-foreground/30 mb-3" />
                                <p className="text-title-sm font-semibold">{_('No teachers assigned')}</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {overviewData?.teacherWorkload?.map((t: any) => (
                                  <div key={t.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                                    <span className="text-title-sm font-semibold">{t.name}</span>
                                    <span className="text-label-sm text-muted-foreground">{t.classCount} {t.classCount === 1 ? 'class' : 'classes'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    </div>
                  </section>

                  <section>
                    <SectionTitle label={_('Activity')} title={_('Recent activity feed')} />
                    <motion.div variants={cardStackReveal} custom={0}>
                      <Card className="border-border/60">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-title-sm flex items-center gap-2">
                            <Icon name="history" size={18} className="text-muted-foreground" />
                            {_('Recent Activity')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {overviewData?.activityFeed?.length === 0 ? (
                            <div className="flex flex-col items-center py-10 text-muted-foreground">
                              <Icon name="history" size={40} className="text-muted-foreground/30 mb-3" />
                              <p className="text-title-sm font-semibold">{_('No recent activity')}</p>
                            </div>
                          ) : (
                            <div className="relative pl-6 border-l-2 border-muted-foreground/20 space-y-4">
                              {overviewData?.activityFeed?.map((item: any) => (
                                <div key={item.id} className="relative">
                                  <div className="absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-surface" />
                                  <p className="text-title-sm font-semibold">{item.title}</p>
                                  <p className="text-label-sm text-muted-foreground">{item.desc}</p>
                                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                    {new Date(item.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </section>
                </div>
              )}

              {activeTab === 'oversight' && (
                <div className="space-y-6">
                  <div className="flex gap-3 items-center flex-wrap">
                    <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                      <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder={_('Search concept oversight...')}
                        className="pl-10"
                        value={oversightSearch}
                        onChange={(e) => setOversightSearch(e.target.value)}
                      />
                    </div>
                    <OptionsSelect
                      options={[
                        { value: 'all', label: _('All Concepts') },
                        { value: 'low', label: _('Low Mastery (Alert)') },
                        { value: 'normal', label: _('Normal Mastery') },
                      ]}
                      value={oversightStatusFilter}
                      onChange={(v: string) => setOversightStatusFilter(v)}
                      className="w-48"
                    />
                  </div>

                    <motion.div variants={cardStackReveal} custom={0} className="space-y-4">
                    {filteredOversight.length === 0 ? (
                      <Card className="border-border/60">
                        <CardContent className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
                          <Icon name="search_off" size={48} className="opacity-50" />
                          <p className="text-title-sm font-semibold">{_('No concepts match your criteria')}</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <TeacherGroupCards
                        items={filteredOversight}
                        onReTeach={(data: any) => reTeachMutation.mutate(data)}
                        reTeachPending={reTeachMutation.isPending}
                        _={_}
                      />
                    )}
                  </motion.div>
                </div>
              )}

              {activeTab === 'tests_monitor' && (
                <div className="space-y-6">
                  <div className="flex gap-3 items-center flex-wrap">
                    <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                      <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input placeholder={_('Search tests...')} className="pl-10" value={testsSearch} onChange={(e) => setTestsSearch(e.target.value)} />
                    </div>
                    <select
                      className="h-10 px-3 rounded-lg border border-border/60 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-48 text-sm"
                      value={testsTypeFilter}
                      onChange={(e) => setTestsTypeFilter(e.target.value)}
                    >
                      <option value="all">{_('All Types')}</option>
                      <option value="quiz">{_('Quizzes')}</option>
                      <option value="exam">{_('Exams')}</option>
                      <option value="assignment">{_('Assignments')}</option>
                    </select>
                  </div>

                  <motion.div variants={cardStackReveal} custom={0}>
                    {filteredTests.length === 0 ? (
                      <Card className="border-border/60">
                        <CardContent className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
                          <Icon name="search_off" size={48} className="opacity-50" />
                          <p className="text-title-sm font-semibold">{_('No conducted tests match your filters')}</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="border border-border/60 rounded-xl overflow-x-auto bg-surface">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                              <th className="px-4 py-3">{_('Test Details')}</th>
                              <th className="px-4 py-3">{_('Class & Subject')}</th>
                              <th className="px-4 py-3">{_('Teacher')}</th>
                              <th className="px-4 py-3">{_('Concept')}</th>
                              <th className="px-4 py-3 text-center">{_('Attempts')}</th>
                              <th className="px-4 py-3 text-center">{_('Avg Score')}</th>
                              <th className="px-4 py-3 text-right">{_('Action')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40 text-title-sm">
                            {filteredTests.map((test: any) => (
                              <tr key={`${test.type}-${test.id}`} className="hover:bg-muted/15 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-bold text-foreground">{test.title}</div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Badge variant={test.type === 'Quiz' ? 'default' : test.type === 'Exam' ? 'destructive' : 'warning'} className="text-[10px] uppercase font-bold py-0 px-1.5 h-4">
                                      {test.type}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground">{new Date(test.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-semibold">{test.className}</div>
                                  <div className="text-label-sm text-muted-foreground">{test.subjectName}</div>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{test.teacherName}</td>
                                <td className="px-4 py-3 text-muted-foreground">{test.conceptName}</td>
                                <td className="px-4 py-3 text-center font-bold font-mono">{test.attemptCount}</td>
                                <td className="px-4 py-3 text-center">
                                  {test.attemptCount > 0 ? (
                                    <span className={`font-bold font-mono ${test.averageScore < 70 ? 'text-error' : 'text-success'}`}>{test.averageScore}%</span>
                                  ) : (
                                    <span className="text-muted-foreground/40">&mdash;</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Button size="sm" variant="outline" onClick={() => setInspectTest(test)}>
                                    <Icon name="visibility" size={16} className="mr-1" />{_('Results')}
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}

              {activeTab === 'monitor' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <SectionTitle label={_('Staff')} title={_('Teachers') + ` (${teachersData.length})`} />
                      <motion.div variants={cardStackReveal} custom={0}>
                        <Card className="border-border/60">
                          <CardContent className="max-h-[400px] overflow-y-auto space-y-1 p-5">
                            {teachersData.length === 0 ? (
                              <p className="text-title-sm text-muted-foreground text-center py-4">{_('No teachers')}</p>
                            ) : (
                              teachersData.slice(0, 20).map((t: any) => (
                                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50">
                                  <span className="text-title-sm font-semibold truncate">{t.displayName || t.email}</span>
                                  <span className="text-label-sm text-muted-foreground capitalize">{t.status || 'active'}</span>
                                </div>
                              ))
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    </div>

                    <div>
                      <SectionTitle label={_('Students')} title={_('Students') + ` (${studentsData.length})`} />
                      <motion.div variants={cardStackReveal} custom={0}>
                        <Card className="border-border/60">
                          <CardContent className="max-h-[400px] overflow-y-auto space-y-1 p-5">
                            {studentsData.length === 0 ? (
                              <p className="text-title-sm text-muted-foreground text-center py-4">{_('No students')}</p>
                            ) : (
                              studentsData.slice(0, 20).map((s: any) => (
                                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50">
                                  <div className="min-w-0">
                                    <p className="text-title-sm font-semibold truncate">{s.displayName || s.email}</p>
                                    <p className="text-label-sm text-muted-foreground">{s.studentId || s.id?.slice(0, 8)}</p>
                                  </div>
                                  <Badge variant={s.level === 'advanced' ? 'success' : s.level === 'intermediate' ? 'warning' : 'secondary'} className="text-[10px] capitalize">{s.level || 'beginner'}</Badge>
                                </div>
                              ))
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    </div>
                  </div>

                  <section>
                    <SectionTitle label={_('Alerts')} title={_('At-risk students')} />
                    <motion.div variants={cardStackReveal} custom={0}>
                      <Card className="border-border/60">
                        <CardContent className="max-h-[400px] overflow-y-auto p-5">
                          {overviewData?.atRiskStudents?.length === 0 ? (
                            <p className="text-title-sm text-muted-foreground text-center py-4">{_('All students performing well')}</p>
                          ) : (
                            <div className="space-y-2">
                              {(overviewData?.atRiskStudents ?? []).slice(0, 15).map((s: any) => (
                                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-error-container/20 border border-error/10">
                                  <div className="min-w-0">
                                    <p className="text-title-sm font-semibold truncate">{s.studentName}</p>
                                    <p className="text-label-sm text-muted-foreground">{s.subject}</p>
                                  </div>
                                  <span className="text-title-sm font-bold text-error">{s.percentage}%</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </section>

                  <section>
                    <SectionTitle label={_('Activity')} title={_('Recent Activity')} />
                    <motion.div variants={cardStackReveal} custom={0}>
                      <Card className="border-border/60">
                        <CardContent className="p-5">
                          {overviewData?.activityFeed?.length === 0 ? (
                            <p className="text-title-sm text-muted-foreground text-center py-4">{_('No recent activity')}</p>
                          ) : (
                            <div className="space-y-2">
                              {overviewData?.activityFeed?.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50">
                                  <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-title-sm font-semibold">{item.title}</p>
                                    <p className="text-label-sm text-muted-foreground">{item.desc}</p>
                                  </div>
                                  <span className="text-label-sm text-muted-foreground shrink-0">
                                    {new Date(item.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </section>
                </div>
              )}
            </motion.div>
          )}
        </DataFetchWrapper>
      </div>

      <Dialog open={!!inspectTest} onOpenChange={(open) => { if (!open) setInspectTest(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-headline-sm font-bold">{inspectTest?.title}</span>
                <span className="text-title-sm font-normal text-muted-foreground flex items-center gap-2">
                  <Badge variant={inspectTest?.type === 'Quiz' ? 'default' : inspectTest?.type === 'Exam' ? 'destructive' : 'warning'} className="text-[10px] uppercase font-bold py-0.5">
                    {inspectTest?.type}
                  </Badge>
                  <span>{_('Class')}: {inspectTest?.className}</span>
                  <span>&bull;</span>
                  <span>{_('Subject')}: {inspectTest?.subjectName}</span>
                </span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-label-sm text-muted-foreground mt-1">
              {_('Conducted by')} {inspectTest?.teacherName} {_('on')} {inspectTest?.conceptName || _('General Concept')}
            </DialogDescription>
          </DialogHeader>

          {isInspectLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Icon name="progress_activity" size={32} className="animate-spin text-primary" />
              <p className="text-title-sm text-muted-foreground">{_('Loading results data...')}</p>
            </div>
          ) : inspectDetails ? (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card variant="outlined">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <span className="text-label-sm text-muted-foreground">{_('Total Submissions')}</span>
                    <span className="text-display-xs font-bold font-mono mt-1">{inspectDetails.attemptCount}</span>
                  </CardContent>
                </Card>
                <Card variant="outlined">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <span className="text-label-sm text-muted-foreground">{_('Average Score')}</span>
                    <span className={`text-display-xs font-bold font-mono mt-1 ${inspectDetails.avgScore < 70 ? 'text-error' : 'text-success'}`}>{inspectDetails.avgScore}%</span>
                  </CardContent>
                </Card>
                <Card variant="outlined">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <span className="text-label-sm text-muted-foreground">{_('Passing Rate')}</span>
                    <span className="text-display-xs font-bold font-mono mt-1 text-primary">{inspectDetails.passRate}%</span>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                  <h3 className="text-title-sm font-bold flex items-center gap-2">
                    <Icon name="list" size={18} />
                    {_('Individual Student Results')}
                  </h3>
                  {(!inspectDetails.studentAttempts || inspectDetails.studentAttempts.length === 0) ? (
                    <div className="flex flex-col items-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-border/60">
                      <Icon name="info" size={32} />
                      <p className="text-title-sm mt-2">{_('No scored submissions found')}</p>
                  </div>
                ) : (
                  <div className="border border-border/60 rounded-xl overflow-x-auto bg-surface">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-b-border/60 bg-muted/30 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                          <th className="px-4 py-2.5">{_('Roll No')}</th>
                          <th className="px-4 py-2.5">{_('Student ID')}</th>
                          <th className="px-4 py-2.5">{_('Name')}</th>
                          <th className="px-4 py-2.5">{_('Submitted At')}</th>
                          <th className="px-4 py-2.5 text-center">{_('Score')}</th>
                          <th className="px-4 py-2.5 text-center">{_('Status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 text-title-sm">
                        {inspectDetails.studentAttempts.map((attempt: any) => (
                          <tr key={attempt.studentId} className="hover:bg-muted/10 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-muted-foreground">{attempt.studentRollNo || '-'}</td>
                            <td className="px-4 py-2.5 font-mono text-label-sm text-muted-foreground">{attempt.studentCustomId || '-'}</td>
                            <td className="px-4 py-2.5 font-semibold">{attempt.studentName}</td>
                            <td className="px-4 py-2.5 text-label-sm text-muted-foreground">{attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : '-'}</td>
                            <td className="px-4 py-2.5 text-center font-bold font-mono">{attempt.percentage}%</td>
                            <td className="px-4 py-2.5 text-center">
                              <Badge variant={attempt.passed ? 'success' : 'destructive'} className="text-[10px] uppercase font-bold px-1.5 py-0">
                                {attempt.passed ? 'Passed' : 'Failed'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">Failed to load details.</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TeacherGroupCards({ items, onReTeach, reTeachPending, _ }: { items: any[]; onReTeach: (data: any) => void; reTeachPending: boolean; _: any }) {
  const [expandedTeachers, setExpandedTeachers] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => {
    const g: Record<string, { items: any[]; totalLow: number; totalConcepts: number; teacherName: string }> = {};
    for (const item of items) {
      const key = item.teacherId || 'unknown';
      if (!g[key]) g[key] = { items: [], totalLow: 0, totalConcepts: 0, teacherName: item.teacherName || 'Unknown' };
      g[key].items.push(item);
      g[key].totalConcepts++;
      if (item.status === 'low') g[key].totalLow++;
    }
    return g;
  }, [items]);
  const toggle = (key: string) => setExpandedTeachers(p => ({ ...p, [key]: !p[key] }));
  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([teacherId, group]) => {
        const expanded = !!expandedTeachers[teacherId];
        const hasAlert = group.totalLow > 0;
        return (
          <Card key={teacherId} className={`border-border/60 overflow-hidden ${hasAlert ? 'ring-1 ring-error/20' : ''}`}>
            <button
              onClick={() => toggle(teacherId)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${hasAlert ? 'bg-error-container text-error' : 'bg-success-container text-success'}`}>
                  <Icon name={hasAlert ? 'warning' : 'check_circle'} size={20} />
                </div>
                <div>
                  <p className="text-title-sm font-bold">{group.teacherName}</p>
                  <p className="text-label-sm text-muted-foreground">
                    {group.totalConcepts} concepts &middot; {group.totalLow} alert{group.totalLow !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {hasAlert && <Badge variant="destructive" className="text-[10px] uppercase font-bold">Alert</Badge>}
                <Icon name={expanded ? 'expand_less' : 'expand_more'} size={20} className="text-muted-foreground" />
              </div>
            </button>
            {expanded && (
              <div className="border-t border-border/40 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/20 text-label-sm font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="text-left px-4 py-3">{_('Class / Subject')}</th>
                      <th className="text-left px-4 py-3">{_('Concept')}</th>
                      <th className="text-center px-4 py-3">{_('Quiz')}</th>
                      <th className="text-center px-4 py-3">{_('Task')}</th>
                      <th className="text-center px-4 py-3">{_('Avg Score')}</th>
                      <th className="text-center px-4 py-3">{_('Attempts')}</th>
                      <th className="text-center px-4 py-3">{_('Status')}</th>
                      <th className="text-right px-4 py-3">{_('Action')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {group.items.map((item: any, idx: number) => {
                      const isLow = item.status === 'low';
                      return (
                        <tr key={`${item.classId}-${item.conceptId}-${idx}`} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="text-body-sm font-bold">{item.className}</div>
                            <div className="text-title-sm text-muted-foreground">{item.subjectName}</div>
                          </td>
                          <td className="px-4 py-3 text-body-sm font-medium max-w-[220px] truncate" title={item.conceptName}>{item.conceptName}</td>
                          <td className="px-4 py-3 text-body-sm font-mono text-center">{item.quizCount ?? 0}</td>
                          <td className="px-4 py-3 text-body-sm font-mono text-center">{item.taskCount ?? 0}</td>
                          <td className="px-4 py-3 font-mono text-body-sm text-center">
                            {item.attemptCount > 0 ? (
                              <span className={isLow ? 'text-error font-bold' : 'text-success font-bold'}>{item.averageScore}%</span>
                            ) : (
                              <span className="text-muted-foreground/40">&mdash;</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-body-sm font-mono text-muted-foreground text-center">{item.attemptCount}</td>
                          <td className="px-4 py-3 text-center">
                            {item.attemptCount > 0 ? (
                              <Badge variant={isLow ? 'destructive' : 'success'} className="text-xs uppercase font-bold px-2 py-0.5">{isLow ? 'Alert' : 'Good'}</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs uppercase font-bold px-2 py-0.5">{_('Untested')}</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant={isLow ? 'destructive' : 'outline'} disabled={!isLow || reTeachPending}
                              onClick={() => onReTeach({
                                teacherId: item.teacherId,
                                className: item.className,
                                subjectName: item.subjectName,
                                conceptName: item.conceptName,
                                section: item.section || '',
                                affectedStudents: item.attemptCount || 0,
                                averageScore: item.averageScore || 0,
                                suggestedReason: `Average score ${item.averageScore}% is below the ${item.threshold}% threshold.`,
                              })}
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
          </Card>
        );
      })}
    </div>
  );
}
