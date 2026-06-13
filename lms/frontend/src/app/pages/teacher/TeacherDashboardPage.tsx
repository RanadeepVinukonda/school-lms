import { useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/authStore';
import { ROUTES } from '@/lib/constants';
import {
  getAllSubjects,
  getAllClasses,
  getAllEnrollments,
  getAllGrades,
  getExamsBySubject,
  getAssignmentsBySubject,
  getCorrectionsByExam,
  getSubmissionsByAssignment,
  getTimetableByClass,
  getNotificationsByUser,
} from '@/services/dataService';
import { getTextbooksBySubject } from '@/services/textbookService';
import { pageTransition, listItem, listContainer } from '@/lib/motion';
import { TeacherHierarchyNav } from '@/components/teacher/TeacherHierarchyNav';

interface NeedsAttentionItem {
  icon: string; label: string; count: number;
  color: string; bg: string; link: string; description: string;
}

interface DashboardData {
  needsAttention: NeedsAttentionItem[];
  todaySchedule: { period: number; subjectName: string; room: string }[];
  stats: { icon: string; label: string; value: string | number; color: string; bg: string }[];
  teaching: { classes: { id: string; name: string }[]; textbooks: { id: string; title: string; subjectId: string }[]; studentCount: number };
}

const QUICK_ACTIONS = [
  { icon: 'add_circle', label: 'Create Exam', link: '/teacher/exams', bg: 'bg-primary-container', color: 'text-on-primary-container' },
  { icon: 'note_add', label: 'Create Assignment', link: '/teacher/assignments', bg: 'bg-secondary-container', color: 'text-on-secondary-container' },
  { icon: 'group', label: 'View Students', link: '/teacher/students', bg: 'bg-success-container', color: 'text-on-success-container' },
  { icon: 'analytics', label: 'View Reports', link: '/teacher/reports', bg: 'bg-warning-container', color: 'text-on-warning-container' },
] as const;

function NeedsAttentionCard({ item }: { item: NeedsAttentionItem }) {
  return (
    <motion.div variants={listItem}>
      <Link to={item.link} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl block h-full">
        <Card className="hover:shadow-md transition-shadow h-full overflow-hidden">
          <CardContent className={`p-4 h-full flex flex-col justify-between ${item.bg}`}>
            <div className="flex items-start justify-between">
              <Icon name={item.icon} size={28} className={item.color} />
              <span className={`text-3xl font-bold tabular-nums ${item.color}`}>{item.count}</span>
            </div>
            <div className="mt-auto pt-3">
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

export default function TeacherDashboardPage() {
  const user = useAuthStore((s) => s.user);
  // Fetch notifications when user ID changes
  useEffect(() => {
    if (user?.id) {
      void getNotificationsByUser(user.id);
    }
  }, [user?.id]);
  const todayDate = useMemo(() => new Date(), []);
  const todayKey = todayDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todayLabel = todayDate.toLocaleDateString('en-US', { weekday: 'long' });

  const { isLoading, error, refetch, data } = useQuery({
    queryKey: ['teacher-dashboard', user?.id],
    queryFn: async (): Promise<DashboardData> => {
      const [allSubjects, allClasses, allEnrollments, allGrades] = await Promise.all([
        getAllSubjects(),
        getAllClasses(),
        getAllEnrollments(),
        getAllGrades(),
      ]);

      const myClassIds = user?.classIds?.length ? user.classIds : (user?.classId ? [user.classId] : []);
      const myClasses = allClasses.filter((c) => myClassIds.includes(c.id));
      const classId = myClasses[0]?.id;
      const subjectIds = [...new Set(myClasses.flatMap((c) => c.subjectIds ?? []))];

      const [examArrays, assignmentArrays, timetable] = await Promise.all([
        Promise.all(subjectIds.map((sid) => getExamsBySubject(sid))),
        Promise.all(subjectIds.map((sid) => getAssignmentsBySubject(sid))),
        classId ? getTimetableByClass(classId) : Promise.resolve([]),
      ]);

      const allExams = examArrays.flat();
      const allAssignments = assignmentArrays.flat();

      const correctionArrays = await Promise.all(
        allExams.map((exam) => getCorrectionsByExam(exam.id)),
      );
      const allCorrections = correctionArrays.flat();

      const submissionArrays = await Promise.all(
        allAssignments.map((ass) => getSubmissionsByAssignment(ass.id)),
      );
      const allSubmissions = submissionArrays.flat();
      // Notifications fetched via useEffect

      const correctedExamIds = new Set(allCorrections.map((c) => c.examId));
      const awaitingGradingCount = allSubmissions.filter((s) => s.status === 'submitted').length;
      const awaitingCorrectionCount = allExams.filter((e) => !correctedExamIds.has(e.id)).length;
      const lateAssignmentsCount = allAssignments.filter(
        (a) => a.dueDate && new Date(a.dueDate) < todayDate,
      ).length;

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
        ? Math.round(gradedEntries.reduce((sum, g) => sum + g.percentage, 0) / gradedEntries.length)
        : 0;

      const totalStudents = new Set(allGrades.map((g) => g.studentId)).size;

      const textbookArrays = await Promise.all(
        subjectIds.map((sid) => getTextbooksBySubject(sid).catch(() => [] as any[])),
      );
      const allTextbooks = textbookArrays.flat();

      const enrolledStudentIds = new Set(
        allEnrollments
          .filter((e) => e.courseId && subjectIds.includes(e.courseId))
          .map((e) => e.studentId),
      );
      const teachingStudentCount = enrolledStudentIds.size;

      return {
        needsAttention: [
          { icon: 'rate_review', label: 'Awaiting Grading', count: awaitingGradingCount, color: 'text-warning', bg: 'bg-warning-container/60', link: '/teacher/assignments', description: 'Assignments to review' },
          { icon: 'fact_check', label: 'Need Correction', count: awaitingCorrectionCount, color: 'text-error', bg: 'bg-error-container/60', link: '/teacher/exams', description: 'Exams to mark' },
          { icon: 'warning', label: 'Late Submissions', count: lateAssignmentsCount, color: 'text-destructive', bg: 'bg-destructive/10', link: '/teacher/assignments?filter=late', description: 'Past due date' },
        ],
        todaySchedule: todaySlots,
        stats: [
          { icon: 'trending_up', label: 'Avg Score', value: `${avgScore}%`, color: 'text-success', bg: 'bg-success-container/60' },
          { icon: 'school', label: 'Total Students', value: totalStudents, color: 'text-primary', bg: 'bg-primary-container/60' },
          { icon: 'assignment', label: 'Exams Created', value: allExams.length, color: 'text-secondary', bg: 'bg-secondary-container/60' },
        ],
        teaching: {
          classes: myClasses.map((c) => ({ id: c.id, name: c.name })),
          textbooks: allTextbooks.map((tb) => ({ id: tb.id, title: tb.title, subjectId: tb.subjectId })),
          studentCount: teachingStudentCount,
        },
      };
    },
  });

  const teacherName = user?.displayName?.split(' ')[0] ?? 'Teacher';

  return (
    <>
      <SEOHead title="Teacher Dashboard" description="Your classroom tasks and schedule at a glance" canonical="/teacher/dashboard" />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-6xl mx-auto space-y-6 pb-20">
        <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="card">
          {(d) => (
            <>
              <motion.div variants={listItem} initial="hidden" animate="show">
                <h1 className="text-headline-sm">Welcome, {teacherName}</h1>
                <p className="text-sm text-muted-foreground">Here&apos;s what needs your attention today</p>
              </motion.div>

              <motion.div variants={listItem} initial="hidden" animate="show" className="bg-card border rounded-xl p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Navigate to Concept</p>
                <TeacherHierarchyNav />
              </motion.div>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="notifications_active" size={20} className="text-destructive" aria-hidden />
                  <h2 className="text-title-md font-semibold">Needs Attention</h2>
                </div>
                <motion.div variants={listContainer} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {d.needsAttention.map((item) => <NeedsAttentionCard key={item.label} item={item} />)}
                </motion.div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <motion.div variants={listItem} initial="hidden" animate="show" className="lg:col-span-2">
                  <Card>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Icon name="schedule" size={18} className="text-muted-foreground" />
                        Today&apos;s Schedule
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">{todayLabel}</Badge>
                    </CardHeader>
                    <CardContent>
                      {d.todaySchedule.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                          <Icon name="event_busy" size={36} className="text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No classes today</p>
                        </div>
                      ) : (
                        <div className="relative pl-6 space-y-4">
                          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border rounded-full" />
                          {d.todaySchedule.map((slot) => (
                            <div key={slot.period} className="relative flex items-center gap-4">
                              <div className="absolute -left-[22px] w-4 h-4 rounded-full bg-primary border-2 border-background" />
                              <span className="text-xs font-semibold text-muted-foreground w-6 text-right flex-shrink-0">P{slot.period}</span>
                              <div className="flex-1 min-w-0 py-1">
                                <p className="text-sm font-medium">{slot.subjectName}</p>
                                <p className="text-xs text-muted-foreground">Room {slot.room}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
              </motion.div>

              {(d.teaching.classes.length > 0 || d.teaching.textbooks.length > 0) && (
                <motion.div variants={listItem} initial="hidden" animate="show">
                  <h2 className="text-title-md font-semibold mb-3">My Teaching</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
                    {d.teaching.classes.length > 0 && (
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary-container flex items-center justify-center flex-shrink-0">
                              <Icon name="school" size={18} className="text-on-primary-container" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">Classes</p>
                              {d.teaching.classes.map((cls) => (
                                <p key={cls.id} className="text-xs text-muted-foreground">{cls.name}</p>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {d.teaching.textbooks.length > 0 && (
                      <Link to={ROUTES.TEACHER_TEXTBOOKS} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
                        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="h-9 w-9 rounded-lg bg-secondary-container flex items-center justify-center flex-shrink-0">
                                <Icon name="menu_book" size={18} className="text-on-secondary-container" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold">Textbooks</p>
                                <p className="text-xs text-muted-foreground">
                                  {d.teaching.textbooks.length} textbook{d.teaching.textbooks.length > 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )}
                    {d.teaching.studentCount > 0 && (
                      <Link to={ROUTES.TEACHER_STUDENTS} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
                        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="h-9 w-9 rounded-lg bg-success-container flex items-center justify-center flex-shrink-0">
                                <Icon name="group" size={18} className="text-on-success-container" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold">Enrolled Students</p>
                                <p className="text-xs text-muted-foreground">
                                  {d.teaching.studentCount} student{d.teaching.studentCount > 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )}
                  </div>
                </motion.div>
              )}

              <motion.div variants={listItem} initial="hidden" animate="show">
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Icon name="analytics" size={18} className="text-muted-foreground" />
                        Class Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {d.stats.map((stat) => (
                        <div key={stat.label} className="flex items-center gap-3 p-2 rounded-lg bg-muted/40">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${stat.bg}`}>
                            <Icon name={stat.icon} size={18} className={stat.color} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-lg font-bold tabular-nums">{stat.value}</p>
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              <motion.div variants={listItem} initial="hidden" animate="show">
                <h2 className="text-title-md font-semibold mb-3">Quick Actions</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {QUICK_ACTIONS.map((action) => (
                    <Link key={action.label} to={action.link} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
                      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                        <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                          <div className={`h-10 w-10 rounded-full ${action.bg} flex items-center justify-center`}>
                            <Icon name={action.icon} size={22} className={action.color} />
                          </div>
                          <p className="text-sm font-medium">{action.label}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
