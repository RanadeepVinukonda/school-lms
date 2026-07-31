import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { PerformanceLogoBadge } from '@/components/common/PerformanceLogoBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import {
  getAllSubjects, getAllClasses, getUserByRole, getAllGrades,
  getExamsBySubject, getAssignmentsBySubject, getCorrectionsByExam,
  getSubmissionsByAssignment, getNotificationsByUser,
} from '@/services/dataService';
import { getTextbooksBySubject } from '@/services/textbookService';
import { teacherClassSubjectService } from '@/services/teacherClassSubjectService';
import { staggerContainer, cardStackReveal } from '@/lib/motion';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useRealtimeInvalidation } from '@/lib/useRealtimeInvalidation';
import api from '@/services/api';
import { attendanceService } from '@/services/attendanceService';

interface NeedsAttentionItem {
  icon: string; label: string; count: number;
  color: string; bg: string; link: string; description: string;
}

interface DashboardData {
  needsAttention: NeedsAttentionItem[];
  stats: { icon: string; label: string; value: string | number; color: string; bg: string; isPerformanceLogo?: boolean }[];
  teaching: {
    classes: { id: string; name: string }[];
    textbooks: { id: string; title: string; subjectId: string }[];
    studentCount: number;
    subjects?: { id: string; name: string }[];
  };
  assignedStudents: { id: string; classId: string; displayName?: string }[];
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
      className="mb-6"
    >
      <p className="text-label-sm font-semibold text-tertiary uppercase tracking-[0.2em] mb-2">{label}</p>
      <h2 className="text-headline-sm md:text-headline-md font-bold tracking-tight">{title}</h2>
    </motion.div>
  );
}

function NeedsAttentionCard({ item }: { item: NeedsAttentionItem }) {
  return (
    <Link to={item.link} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl block">
      <Card className="hover:shadow-md transition-shadow h-full border-border/60">
        <CardContent className={`p-5 h-full flex flex-col justify-between`}>
          <div className="flex items-start justify-between">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${item.bg}`}>
              <Icon name={item.icon} size={24} className={item.color} />
            </div>
            <span className={`text-display-xs font-bold tabular-nums ${item.color}`}>{item.count}</span>
          </div>
          <div className="mt-6">
            <p className="text-title-sm font-bold">{item.label}</p>
            <p className="text-label-sm text-muted-foreground mt-0.5">{item.description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function TeacherDashboardPage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const QUICK_ACTIONS = [
    { icon: 'group', label: _('View Students'), link: '/teacher/students', bg: 'bg-success-container', color: 'text-success' },
    { icon: 'analytics', label: _('View Analytics'), link: '/teacher/analytics', bg: 'bg-warning-container', color: 'text-warning' },
  ] as const;
  useEffect(() => {
    if (user?.id) { void getNotificationsByUser(user.id); }
  }, [user?.id]);
  const todayDate = useMemo(() => new Date(), []);
  const todayKey = todayDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todayLabel = todayDate.toLocaleDateString('en-US', { weekday: 'long' });

  const queryClient = useQueryClient();

  const { isLoading, error, refetch, data } = useQuery({
    queryKey: ['teacher-dashboard', user?.id],
    queryFn: async (): Promise<DashboardData> => {
      const [allSubjects, allClasses, students, allGrades, assignmentsRes] = await Promise.all([
        getAllSubjects(), getAllClasses(), getUserByRole('student'), getAllGrades(),
        teacherClassSubjectService.getMyAssignments().catch(() => ({ data: [] })),
      ]);

      const myAssignments = assignmentsRes?.data ?? [];
      const myClassIds = [...new Set(myAssignments.map((a) => a.classId))];
      const myClasses = allClasses.filter((c) => myClassIds.includes(c.id));
      const subjectIds = [...new Set(myAssignments.map((a) => a.subjectId))];

      const [examArrays, assignmentArrays] = await Promise.all([
        Promise.all(subjectIds.map((sid) => getExamsBySubject(sid))),
        Promise.all(subjectIds.map((sid) => getAssignmentsBySubject(sid))),
      ]);

      const allExams = examArrays.flat();
      const allAssignments = assignmentArrays.flat();

      const [correctionArrays, submissionArrays] = await Promise.all([
        Promise.all(allExams.map(async (exam) => {
          try { return await getCorrectionsByExam(exam.id); }
          catch (e) { console.error('[teacher-dashboard] getCorrectionsByExam failed:', e); return []; }
        })),
        Promise.all(allAssignments.map((ass) => getSubmissionsByAssignment(ass.id))),
      ]);
      const allCorrections = correctionArrays.flat();
      const allSubmissions = submissionArrays.flat();

      const correctedExamIds = new Set(allCorrections.map((c) => c.examId));
      const awaitingGradingCount = allSubmissions.filter((s) => s.status === 'submitted').length;
      const awaitingCorrectionCount = allExams.filter((e) => !correctedExamIds.has(e.id)).length;
      const lateAssignmentsCount = allAssignments.filter((a) => a.dueDate && new Date(a.dueDate) < todayDate).length;

      const assignedStudents = students.filter(
        (s): s is typeof s & { classId: string } => !!s.classId && myClassIds.includes(s.classId)
      );
      const myStudentIds = new Set(assignedStudents.map(s => s.id));
      const gradedEntries = allGrades.filter((g) => g.percentage != null && myStudentIds.has(g.studentId));
      const avgScore = gradedEntries.length > 0
        ? Math.round(gradedEntries.reduce((sum, g) => sum + g.percentage, 0) / gradedEntries.length) : 0;

      const textbookArrays = await Promise.all(
        subjectIds.map((sid) => getTextbooksBySubject(sid).catch(() => [] as any[])),
      );
      const allTextbooks = textbookArrays.flat();
      const teachingStudentCount = assignedStudents.length;

      return {
        needsAttention: [
          { icon: 'rate_review', label: _('Awaiting Grading'), count: awaitingGradingCount, color: 'text-warning', bg: 'bg-warning-container', link: '/teacher/assignments', description: _('Assignments to review') },
          { icon: 'fact_check', label: _('Need Correction'), count: awaitingCorrectionCount, color: 'text-error', bg: 'bg-error-container', link: '/teacher/exams', description: _('Exams to mark') },
          { icon: 'warning', label: _('Late Submissions'), count: lateAssignmentsCount, color: 'text-destructive', bg: 'bg-destructive/10', link: '/teacher/assignments?filter=late', description: _('Past due date') },
        ],
        stats: [
          { icon: 'trending_up', label: _('Avg Score'), value: `${avgScore}%`, color: 'text-success', bg: 'bg-success-container', isPerformanceLogo: true },
          { icon: 'school', label: _('Total Students'), value: teachingStudentCount, color: 'text-primary', bg: 'bg-primary-container' },
          { icon: 'assignment', label: _('Exams Created'), value: allExams.length, color: 'text-secondary', bg: 'bg-secondary-container' },
        ],
        teaching: {
          classes: myClasses.map((c) => ({ id: c.id, name: `${c.name}${(c as any).section ? ` - ${(c as any).section}` : ''}` })),
          textbooks: allTextbooks.map((tb) => ({ id: tb.id, title: tb.title, subjectId: tb.subjectId })),
          studentCount: teachingStudentCount,
          subjects: allSubjects.filter(s => subjectIds.includes(s.id)).map(s => ({ id: s.id, name: s.name })),
        },
        assignedStudents: assignedStudents.map((s) => ({ id: s.id, classId: s.classId!, displayName: s.displayName })),
      };
    },
  });

  // Realtime: auto-refresh dashboard on submissions, grades, corrections
  useRealtimeSubscription({
    table: 'submissions',
    event: 'INSERT',
    callback: () => { queryClient.invalidateQueries({ queryKey: ['teacher-dashboard', user?.id] }); },
  });
  useRealtimeSubscription({
    table: 'grades',
    event: 'INSERT',
    callback: () => { queryClient.invalidateQueries({ queryKey: ['teacher-dashboard', user?.id] }); },
  });
  useRealtimeSubscription({
    table: 'corrections',
    event: 'INSERT',
    callback: () => { queryClient.invalidateQueries({ queryKey: ['teacher-dashboard', user?.id] }); },
  });

  useRealtimeInvalidation([{ table: 'submissions', queryKey: ['teacher-dashboard', user?.id ?? ''] }]);

  const firstClassId = (data as any)?.teaching?.classes?.[0]?.id;
  const { data: skillDist } = useQuery({
    queryKey: ['teacher-skill-distribution', firstClassId],
    queryFn: () => api.get(`/adaptive/skill-distribution/${firstClassId}`).then((r) => r.data.data),
    enabled: !!firstClassId,
  });

  const { data: todayAttendanceByClass = {} } = useQuery({
    queryKey: ['teacher-today-attendance', data?.teaching.classes.map((c: any) => c.id)],
    queryFn: async () => {
      const result: Record<string, any> = {};
      const today = new Date().toISOString().slice(0, 10);
      for (const cls of (data?.teaching.classes || [])) {
        try {
          const res = await attendanceService.getClassAttendance(cls.id, today);
          const records = res.data || [];
          result[cls.id] = records.reduce((acc: any, r: any) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
          }, { present: 0, absent: 0, late: 0, holiday: 0 });
        } catch { result[cls.id] = { present: 0, absent: 0, late: 0, holiday: 0 }; }
      }
      return result;
    },
    enabled: !!data?.teaching.classes?.length,
  });

  const teacherName = user?.displayName?.split(' ')[0] ?? _('Teacher');

  return (
    <>
      <SEOHead title={_('Teacher Dashboard')} description={_('Your classroom tasks and schedule at a glance')} canonical="/teacher/dashboard" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32"
      >
        <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="card">
          {(d) => (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-20"
            >
              <section>
                <motion.div variants={cardStackReveal} custom={0}>
                  <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">
                    {_('Welcome')}, {teacherName}
                  </h1>
                  <p className="text-body-md text-muted-foreground mt-1">{_('Overview of your classroom today')}</p>
                </motion.div>
              </section>

              <section>
                <SectionTitle label={_('Alerts')} title={_('Needs your attention')} />
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-60px' }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                  {d.needsAttention.map((item) => (
                    <motion.div key={item.label} variants={cardStackReveal} custom={0}>
                      <NeedsAttentionCard item={item} />
                    </motion.div>
                  ))}
                </motion.div>
              </section>

              <section>
                <SectionTitle label={_('Performance')} title={_('Class metrics')} />
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-60px' }}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                  {d.stats.map((stat) => (
                    <motion.div key={stat.label} variants={cardStackReveal} custom={0}>
                      <Card className="border-border/60">
                        <CardContent className="p-5 flex items-center gap-4">
                          {stat.isPerformanceLogo ? (
                            <PerformanceLogoBadge className={stat.bg} />
                          ) : (
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}>
                              <Icon name={stat.icon} size={22} className={stat.color} />
                            </div>
                          )}
                          <div>
                            <p className="text-display-xs font-bold tabular-nums leading-none mb-1">{stat.value}</p>
                            <p className="text-label-sm text-muted-foreground">{stat.label}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </section>

              {skillDist && skillDist.total > 0 && (
                <section>
                  <SectionTitle label={_('Skills')} title={_('Student skill levels')} />
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: '-60px' }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                  >
                    {['beginner', 'intermediate', 'advanced'].map((level) => {
                      const count = skillDist.distribution?.[level] || 0;
                      const pct = skillDist.total > 0 ? Math.round((count / skillDist.total) * 100) : 0;
                      const colors: Record<string, string> = {
                        beginner: 'bg-warning-container text-warning border-warning/20',
                        intermediate: 'bg-primary-container text-primary border-primary/20',
                        advanced: 'bg-success-container text-success border-success/20',
                      };
                      return (
                        <motion.div key={level} variants={cardStackReveal} custom={0}>
                          <Card className="border-border/60">
                            <CardContent className="p-5 text-center space-y-2">
                              <p className={cn('text-display-xs font-bold capitalize', colors[level].split(' ')[1])}>{count}</p>
                              <p className="text-title-sm font-medium capitalize">{_(level)}</p>
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className={cn('h-full rounded-full transition-all', level === 'beginner' ? 'bg-warning' : level === 'intermediate' ? 'bg-primary' : 'bg-success')} style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-label-xs text-muted-foreground">{pct}% {_('of class')}</p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </section>
              )}

              <section>
                <SectionTitle label={_('My Students')} title={_('Student overview by class')} />
                <div className="flex gap-3 items-center flex-wrap mb-6">
                  <select
                    className="h-10 flex-1 min-w-0 sm:min-w-[200px] px-3 rounded-lg border border-border/60 bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                    value={selectedClassFilter}
                    onChange={(e) => setSelectedClassFilter(e.target.value)}
                  >
                    <option value="">{_('All Classes')}</option>
                    {d.teaching.classes.map((cls: any) => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-60px' }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {d.teaching.classes.filter((cls: any) => !selectedClassFilter || cls.id === selectedClassFilter).map((cls: any) => {
                    const classStudents = d.assignedStudents.filter((s: any) => s.classId === cls.id);
                    const totalStudents = classStudents.length;
                    const presentCount = todayAttendanceByClass[cls.id]?.present ?? 0;
                    const absentCount = todayAttendanceByClass[cls.id]?.absent ?? 0;
                    return (
                      <motion.div key={cls.id} variants={cardStackReveal} custom={0}>
                        <Card className="border-border/60 hover:shadow-md transition-shadow">
                          <CardContent className="p-5">
                            <div className="flex items-start gap-4">
                              <div className="h-12 w-12 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
                                <Icon name="school" size={22} className="text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-title-sm font-bold">{cls.name}</p>
                                <p className="text-label-sm text-muted-foreground">{totalStudents} students</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                              <div className="p-3 rounded-lg bg-success-container/30 text-center">
                                <p className="text-display-xs font-bold text-success">{presentCount}</p>
                                <p className="text-label-xs text-muted-foreground">Present</p>
                              </div>
                              <div className="p-3 rounded-lg bg-error-container/30 text-center">
                                <p className="text-display-xs font-bold text-error">{absentCount}</p>
                                <p className="text-label-xs text-muted-foreground">Absent</p>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 mt-4">
                              <Link to={`/teacher/students?classId=${cls.id}`} className="flex-1">
                                <Button variant="outline" size="sm" className="w-full">
                                  <Icon name="group" size={14} className="mr-1" /> View Students
                                </Button>
                              </Link>
                              <Link to={`/teacher/analytics?classId=${cls.id}`} className="flex-1">
                                <Button variant="outline" size="sm" className="w-full">
                                  <Icon name="analytics" size={14} className="mr-1" /> Analytics
                                </Button>
                              </Link>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </section>

              <section>
                <SectionTitle label={_('Actions')} title={_('Quick tasks')} />
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-60px' }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  {QUICK_ACTIONS.map((action) => (
                    <motion.div key={action.label} variants={cardStackReveal} custom={0}>
                      <Link to={action.link} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl block">
                        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-border/60">
                          <CardContent className="p-5 flex flex-col items-center gap-3 text-center">
                            <div className={`h-12 w-12 rounded-xl ${action.bg} flex items-center justify-center`}>
                              <Icon name={action.icon} size={24} className={action.color} />
                            </div>
                            <p className="text-title-sm font-bold">{action.label}</p>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            </motion.div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
