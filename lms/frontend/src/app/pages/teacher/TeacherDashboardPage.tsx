import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/authStore';
import {
  mockUsers, mockClasses, mockSubjects, mockExams, mockGrades,
  mockSubmissions, mockAssignments, mockCorrections, mockTimetable,
} from '@/lib/mockData';
import { pageTransition, listItem, listContainer } from '@/lib/motion';

interface NeedsAttentionItem {
  icon: string; label: string; count: number;
  color: string; bg: string; link: string; description: string;
}

interface DashboardData {
  needsAttention: NeedsAttentionItem[];
  todaySchedule: { period: number; subjectName: string; room: string }[];
  stats: { icon: string; label: string; value: string | number; color: string; bg: string }[];
}

const QUICK_ACTIONS = [
  { icon: 'add_circle', label: 'Create Exam', link: '/teacher/exams', bg: 'bg-primary-container', color: 'text-on-primary-container' },
  { icon: 'note_add', label: 'Create Assignment', link: '/teacher/assignments', bg: 'bg-secondary-container', color: 'text-on-secondary-container' },
  { icon: 'group', label: 'View Students', link: '/teacher/students', bg: 'bg-success-container', color: 'text-on-success-container' },
  { icon: 'chat', label: 'Message Class', link: null, bg: 'bg-warning-container', color: 'text-on-warning-container' },
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
  const todayDate = useMemo(() => new Date(), []);
  const todayKey = todayDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todayLabel = todayDate.toLocaleDateString('en-US', { weekday: 'long' });

  const { isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: async () => { await new Promise((r) => setTimeout(r, 600)); return null; },
  });

  const data = useMemo((): DashboardData => {
    const teacherMock = Object.values(mockUsers).find((u) => u.id === user?.id);
    const classId = mockClasses.find((c) => c.classTeacherId === teacherMock?.id)?.id;

    const correctedExamIds = new Set(mockCorrections.map((c) => c.examId));
    const awaitingGradingCount = mockSubmissions.filter((s) => (s.status as string) === 'submitted').length;
    const awaitingCorrectionCount = mockExams.filter((e) => !correctedExamIds.has(e.id)).length;
    const lateAssignmentsCount = mockAssignments.filter((a) => new Date(a.dueDate) < todayDate).length;

    const todaySlots = mockTimetable
      .filter((t) => t.classId === classId && t.day === todayKey)
      .sort((a, b) => a.period - b.period)
      .map((t) => ({
        period: t.period,
        subjectName: mockSubjects.find((s) => s.id === t.subjectId)?.name ?? 'Unknown',
        room: t.room,
      }));

    const gradedEntries = mockGrades.filter((g) => g.percentage != null);
    const avgScore = gradedEntries.length > 0
      ? Math.round(gradedEntries.reduce((sum, g) => sum + g.percentage, 0) / gradedEntries.length)
      : 0;

    return {
      needsAttention: [
        { icon: 'rate_review', label: 'Awaiting Grading', count: awaitingGradingCount, color: 'text-warning', bg: 'bg-warning-container/60', link: '/teacher/assignments', description: 'Assignments to review' },
        { icon: 'fact_check', label: 'Need Correction', count: awaitingCorrectionCount, color: 'text-error', bg: 'bg-error-container/60', link: '/teacher/exams', description: 'Exams to mark' },
        { icon: 'warning', label: 'Late Submissions', count: lateAssignmentsCount, color: 'text-destructive', bg: 'bg-destructive/10', link: '/teacher/assignments?filter=late', description: 'Past due date' },
      ],
      todaySchedule: todaySlots,
      stats: [
        { icon: 'trending_up', label: 'Avg Score', value: `${avgScore}%`, color: 'text-success', bg: 'bg-success-container/60' },
        { icon: 'school', label: 'Total Students', value: new Set(mockGrades.map((g) => g.studentId)).size, color: 'text-primary', bg: 'bg-primary-container/60' },
        { icon: 'assignment', label: 'Exams Created', value: mockExams.length, color: 'text-secondary', bg: 'bg-secondary-container/60' },
      ],
    };
  }, [user, todayKey, todayDate]);

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

              {/* Section 1: Needs Attention */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="notifications_active" size={20} className="text-destructive" aria-hidden />
                  <h2 className="text-title-md font-semibold">Needs Attention</h2>
                </div>
                <motion.div variants={listContainer} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {d.needsAttention.map((item) => <NeedsAttentionCard key={item.label} item={item} />)}
                </motion.div>
              </section>

              {/* Section 2: Today's Schedule + Section 3: Class Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

              {/* Section 4: Quick Actions */}
              <motion.div variants={listItem} initial="hidden" animate="show">
                <h2 className="text-title-md font-semibold mb-3">Quick Actions</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {QUICK_ACTIONS.map((action) =>
                    action.link ? (
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
                    ) : (
                      <button key={action.label} type="button" onClick={() => toast.success('Messaging coming soon!')}
                        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl text-left w-full"
                      >
                        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                          <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                            <div className={`h-10 w-10 rounded-full ${action.bg} flex items-center justify-center`}>
                              <Icon name={action.icon} size={22} className={action.color} />
                            </div>
                            <p className="text-sm font-medium">{action.label}</p>
                          </CardContent>
                        </Card>
                      </button>
                    ),
                  )}
                </div>
              </motion.div>
            </>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
