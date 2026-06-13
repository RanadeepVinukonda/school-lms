import { useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import {
  getAllSubjects, getAllClasses, getAllEnrollments, getAllGrades,
  getExamsBySubject, getAssignmentsBySubject, getCorrectionsByExam,
  getSubmissionsByAssignment, getTimetableByClass, getNotificationsByUser,
} from '@/services/dataService';
import { getTextbooksBySubject } from '@/services/textbookService';
import { teacherClassSubjectService } from '@/services/teacherClassSubjectService';
import { staggerContainer, cardStackReveal } from '@/lib/motion';

interface NeedsAttentionItem {
  icon: string; label: string; count: number;
  color: string; bg: string; link: string; description: string;
}

interface DashboardData {
  needsAttention: NeedsAttentionItem[];
  todaySchedule: { period: number; subjectName: string; room: string }[];
  stats: { icon: string; label: string; value: string | number; color: string; bg: string }[];
  teaching: {
    classes: { id: string; name: string }[];
    textbooks: { id: string; title: string; subjectId: string }[];
    studentCount: number;
    subjects?: { id: string; name: string }[];
  };
}

const QUICK_ACTIONS = [
  { icon: 'add_circle', label: 'Create Exam', link: '/teacher/exams', bg: 'bg-primary-container', color: 'text-primary' },
  { icon: 'note_add', label: 'Create Assignment', link: '/teacher/assignments', bg: 'bg-secondary-container', color: 'text-secondary' },
  { icon: 'group', label: 'View Students', link: '/teacher/students', bg: 'bg-success-container', color: 'text-success' },
  { icon: 'analytics', label: 'View Reports', link: '/teacher/reports', bg: 'bg-warning-container', color: 'text-warning' },
] as const;

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
  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    if (user?.id) { void getNotificationsByUser(user.id); }
  }, [user?.id]);
  const todayDate = useMemo(() => new Date(), []);
  const todayKey = todayDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todayLabel = todayDate.toLocaleDateString('en-US', { weekday: 'long' });

  const { isLoading, error, refetch, data } = useQuery({
    queryKey: ['teacher-dashboard', user?.id],
    queryFn: async (): Promise<DashboardData> => {
      const [allSubjects, allClasses, allEnrollments, allGrades, assignmentsRes] = await Promise.all([
        getAllSubjects(), getAllClasses(), getAllEnrollments(), getAllGrades(),
        teacherClassSubjectService.getMyAssignments().catch(() => ({ data: [] })),
      ]);

      const myAssignments = assignmentsRes?.data ?? [];
      const myClassIds = [...new Set(myAssignments.map((a) => a.classId))];
      const myClasses = allClasses.filter((c) => myClassIds.includes(c.id));
      const classId = myClasses[0]?.id;
      const subjectIds = [...new Set(myAssignments.map((a) => a.subjectId))];

      const [examArrays, assignmentArrays, timetable] = await Promise.all([
        Promise.all(subjectIds.map((sid) => getExamsBySubject(sid))),
        Promise.all(subjectIds.map((sid) => getAssignmentsBySubject(sid))),
        classId ? getTimetableByClass(classId) : Promise.resolve([]),
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

      const todaySlots = timetable
        .filter((t) => t.day === todayKey)
        .sort((a, b) => (a.period ?? 0) - (b.period ?? 0))
        .map((t) => ({
          period: t.period ?? 0,
          subjectName: allSubjects.find((s) => s.id === t.subjectId)?.name ?? 'Unknown',
          room: t.room ?? '',
        }));

      const gradedEntries = allGrades.filter((g) => g.percentage != null);
      const avgScore = gradedEntries.length > 0
        ? Math.round(gradedEntries.reduce((sum, g) => sum + g.percentage, 0) / gradedEntries.length) : 0;
      const totalStudents = new Set(allGrades.map((g) => g.studentId)).size;

      const textbookArrays = await Promise.all(
        subjectIds.map((sid) => getTextbooksBySubject(sid).catch(() => [] as any[])),
      );
      const allTextbooks = textbookArrays.flat();

      const enrolledStudentIds = new Set(
        allEnrollments.filter((e) => e.courseId && subjectIds.includes(e.courseId)).map((e) => e.studentId),
      );
      const teachingStudentCount = enrolledStudentIds.size;

      return {
        needsAttention: [
          { icon: 'rate_review', label: 'Awaiting Grading', count: awaitingGradingCount, color: 'text-warning', bg: 'bg-warning-container', link: '/teacher/assignments', description: 'Assignments to review' },
          { icon: 'fact_check', label: 'Need Correction', count: awaitingCorrectionCount, color: 'text-error', bg: 'bg-error-container', link: '/teacher/exams', description: 'Exams to mark' },
          { icon: 'warning', label: 'Late Submissions', count: lateAssignmentsCount, color: 'text-destructive', bg: 'bg-destructive/10', link: '/teacher/assignments?filter=late', description: 'Past due date' },
        ],
        todaySchedule: todaySlots,
        stats: [
          { icon: 'trending_up', label: 'Avg Score', value: `${avgScore}%`, color: 'text-success', bg: 'bg-success-container' },
          { icon: 'school', label: 'Total Students', value: totalStudents, color: 'text-primary', bg: 'bg-primary-container' },
          { icon: 'assignment', label: 'Exams Created', value: allExams.length, color: 'text-secondary', bg: 'bg-secondary-container' },
        ],
        teaching: {
          classes: myClasses.map((c) => ({ id: c.id, name: c.name })),
          textbooks: allTextbooks.map((tb) => ({ id: tb.id, title: tb.title, subjectId: tb.subjectId })),
          studentCount: teachingStudentCount,
          subjects: allSubjects.filter(s => subjectIds.includes(s.id)).map(s => ({ id: s.id, name: s.name })),
        },
      };
    },
  });

  const teacherName = user?.displayName?.split(' ')[0] ?? 'Teacher';

  return (
    <>
      <SEOHead title="Teacher Dashboard" description="Your classroom tasks and schedule at a glance" canonical="/teacher/dashboard" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-6 max-w-6xl mx-auto pb-32"
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
                    Welcome, {teacherName}
                  </h1>
                  <p className="text-body-md text-muted-foreground mt-1">Overview of your classroom today</p>
                </motion.div>
              </section>

              <section>
                <SectionTitle label="Alerts" title="Needs your attention" />
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

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <SectionTitle label="Schedule" title="Today&apos;s timetable" />
                  <motion.div variants={cardStackReveal} custom={0}>
                    <Card className="border-border/60">
                      <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-title-sm flex items-center gap-2">
                          <Icon name="schedule" size={18} className="text-muted-foreground" />
                          {todayLabel}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {d.todaySchedule.length === 0 ? (
                          <div className="flex flex-col items-center gap-2 py-10 text-center">
                            <Icon name="event_busy" size={40} className="text-muted-foreground/30" />
                            <p className="text-body-md text-muted-foreground">No classes scheduled today</p>
                          </div>
                        ) : (
                          <div className="relative pl-6 space-y-4">
                            <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-border rounded-full" />
                            {d.todaySchedule.map((slot) => (
                              <div key={slot.period} className="relative flex items-center gap-4">
                                <div className="absolute -left-[22px] w-[14px] h-[14px] rounded-full bg-primary border-[3px] border-surface" />
                                <span className="text-xs font-bold text-muted-foreground w-6 text-right shrink-0">P{slot.period}</span>
                                <div className="flex-1 min-w-0 py-1">
                                  <p className="text-title-sm font-semibold">{slot.subjectName}</p>
                                  <p className="text-label-sm text-muted-foreground">Room {slot.room}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                <div>
                  <SectionTitle label="Performance" title="Class metrics" />
                  <motion.div variants={cardStackReveal} custom={0}>
                    <Card className="border-border/60 h-full">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-title-sm flex items-center gap-2">
                          <Icon name="analytics" size={18} className="text-muted-foreground" />
                          Key Metrics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {d.stats.map((stat) => (
                          <div key={stat.label} className="flex items-center gap-4 p-3 rounded-xl bg-muted/40">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${stat.bg}`}>
                              <Icon name={stat.icon} size={20} className={stat.color} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-display-xs font-bold tabular-nums">{stat.value}</p>
                              <p className="text-label-sm text-muted-foreground">{stat.label}</p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </section>

              {(d.teaching.classes.length > 0 || d.teaching.textbooks.length > 0 || (d.teaching.subjects?.length ?? 0) > 0) && (
                <section>
                  <SectionTitle label="Teaching" title="Your classes & resources" />
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
                                  <p className="text-label-sm text-muted-foreground mt-1">View subjects &rarr;</p>
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
                                  <p className="text-title-sm font-bold">All Textbooks</p>
                                  <p className="text-label-sm text-muted-foreground mt-1">{d.teaching.textbooks.length} textbook{d.teaching.textbooks.length > 1 ? 's' : ''}</p>
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
                                  <p className="text-title-sm font-bold">Enrolled Students</p>
                                  <p className="text-label-sm text-muted-foreground mt-1">{d.teaching.studentCount} student{d.teaching.studentCount > 1 ? 's' : ''}</p>
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
                <SectionTitle label="Actions" title="Quick tasks" />
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: '-60px' }}
                  className="grid grid-cols-2 lg:grid-cols-4 gap-4"
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
