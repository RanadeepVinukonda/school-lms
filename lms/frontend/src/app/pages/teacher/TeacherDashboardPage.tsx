import { useMemo, useRef, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
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

interface NeedsAttentionItem {
  icon: string; label: string; count: number;
  color: string; bg: string; link: string; description: string;
}

interface DashboardData {
  needsAttention: NeedsAttentionItem[];
  stats: { icon: string; label: string; value: string | number; color: string; bg: string }[];
  teaching: {
    classes: { id: string; name: string }[];
    textbooks: { id: string; title: string; subjectId: string }[];
    studentCount: number;
    subjects?: { id: string; name: string }[];
  };
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
  const QUICK_ACTIONS = [
    { icon: 'add_circle', label: _('Create Exam'), link: '/teacher/exams/create', bg: 'bg-primary-container', color: 'text-primary' },
    { icon: 'note_add', label: _('Create Quiz/Task'), link: '/teacher/assessments', bg: 'bg-secondary-container', color: 'text-secondary' },
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
        Promise.all(allExams.map((exam) => getCorrectionsByExam(exam.id))),
        Promise.all(allAssignments.map((ass) => getSubmissionsByAssignment(ass.id))),
      ]);
      const allCorrections = correctionArrays.flat();
      const allSubmissions = submissionArrays.flat();

      const correctedExamIds = new Set(allCorrections.map((c) => c.examId));
      const awaitingGradingCount = allSubmissions.filter((s) => s.status === 'submitted').length;
      const awaitingCorrectionCount = allExams.filter((e) => !correctedExamIds.has(e.id)).length;
      const lateAssignmentsCount = allAssignments.filter((a) => a.dueDate && new Date(a.dueDate) < todayDate).length;

      const assignedStudents = students.filter(
        (s) => s.classId && myClassIds.includes(s.classId)
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
          { icon: 'trending_up', label: _('Avg Score'), value: `${avgScore}%`, color: 'text-success', bg: 'bg-success-container' },
          { icon: 'school', label: _('Total Students'), value: teachingStudentCount, color: 'text-primary', bg: 'bg-primary-container' },
          { icon: 'assignment', label: _('Exams Created'), value: allExams.length, color: 'text-secondary', bg: 'bg-secondary-container' },
        ],
        teaching: {
          classes: myClasses.map((c) => ({ id: c.id, name: `${c.name}${(c as any).section ? ` - ${(c as any).section}` : ''}` })),
          textbooks: allTextbooks.map((tb) => ({ id: tb.id, title: tb.title, subjectId: tb.subjectId })),
          studentCount: teachingStudentCount,
          subjects: allSubjects.filter(s => subjectIds.includes(s.id)).map(s => ({ id: s.id, name: s.name })),
        },
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
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}>
                            <Icon name={stat.icon} size={22} className={stat.color} />
                          </div>
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

              {(d.teaching.classes.length > 0 || d.teaching.textbooks.length > 0 || (d.teaching.subjects?.length ?? 0) > 0) && (
                <section>
                  <SectionTitle label={_('Teaching')} title={_('Your classes & resources')} />
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: '-60px' }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {d.teaching.classes.map((cls) => (
                      <motion.div key={cls.id} variants={cardStackReveal} custom={0}>
                        <Link
                          to={ROUTES.TEACHER_CLASS(cls.id)}
                          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl block"
                        >
                          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-border/60">
                            <CardContent className="p-5">
                              <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
                                  <Icon name="school" size={22} className="text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-title-sm font-bold">{cls.name}</p>
                                  <p className="text-label-sm text-muted-foreground mt-1">{_('View subjects')} &rarr;</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                    {d.teaching.textbooks.length > 0 && (
                      <motion.div variants={cardStackReveal} custom={0}>
                        <Link to={ROUTES.TEACHER_TEXTBOOKS} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl block">
                          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-border/60">
                            <CardContent className="p-5">
                              <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-xl bg-secondary-container flex items-center justify-center shrink-0">
                                  <Icon name="menu_book" size={22} className="text-secondary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-title-sm font-bold">{_('All Textbooks')}</p>
                                  <p className="text-label-sm text-muted-foreground mt-1">{d.teaching.textbooks.length} {_('textbook')}{d.teaching.textbooks.length > 1 ? _('s') : ''}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    )}
                    {d.teaching.studentCount > 0 && (
                      <motion.div variants={cardStackReveal} custom={0}>
                        <Link to={ROUTES.TEACHER_STUDENTS} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl block">
                          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-border/60">
                            <CardContent className="p-5">
                              <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-xl bg-success-container flex items-center justify-center shrink-0">
                                  <Icon name="group" size={22} className="text-success" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-title-sm font-bold">{_('My Students')}</p>
                                  <p className="text-label-sm text-muted-foreground mt-1">{d.teaching.studentCount} {_('student')}{d.teaching.studentCount > 1 ? _('s') : ''}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    )}
                  </motion.div>
                </section>
              )}

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
