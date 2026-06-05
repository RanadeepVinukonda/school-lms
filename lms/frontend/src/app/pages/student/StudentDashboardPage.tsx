import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@/components/ui/Icon';
import { useAuthStore } from '@/store/authStore';
import { cn, getTimeGreeting } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/format';
import { pageTransition, listItem } from '@/lib/motion';
import {
  mockUsers, mockEnrollments, mockSubjects,
  mockAssignments, mockExams, mockTimetable, mockGrades,
} from '@/lib/mockData';
import { getAllTextbooks, getAllConceptProgress } from '@/services/textbookService';
import { ROUTES } from '@/lib/constants';

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const motivationalMessages = [
  'Every expert was once a beginner. Keep going!',
  'The secret of getting ahead is getting started.',
  'Education is the most powerful weapon to change the world.',
  'The beautiful thing about learning is that no one can take it away from you.',
  'Success is the sum of small efforts repeated day in and day out.',
  'Believe you can and you\u2019re halfway there.',
];

const mockAnnouncements = [
  { id: 'ann1', type: 'school' as const, title: 'School Spirit Week', body: 'Join us for Spirit Week starting Monday! Dress according to the daily themes.', createdAt: new Date(Date.now()).toISOString(), priority: 'high' as const, icon: 'celebration' as const },
  { id: 'ann2', type: 'teacher' as const, title: 'Math Extra Credit Opportunity', body: 'Dr. Wilson has posted an extra credit assignment for the Algebra unit.', createdAt: new Date(Date.now() - 86400000).toISOString(), priority: 'normal' as const, icon: 'school' as const },
  { id: 'ann3', type: 'teacher' as const, title: 'Physics Lab Tomorrow', body: 'Remember to bring your lab notebooks for tomorrow\u2019s experiment on Newton\u2019s Laws.', createdAt: new Date(Date.now() - 86400000 * 0.5).toISOString(), priority: 'high' as const, icon: 'science' as const },
  { id: 'ann4', type: 'school' as const, title: 'Library Hours Updated', body: 'The school library will now be open until 6 PM on weekdays.', createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), priority: 'normal' as const, icon: 'local_library' as const },
];

interface ContinueLearning { subjectName: string; subjectColor: string; subjectIcon: string; textbookTitle: string; chapterTitle: string; lessonTitle: string; conceptId: string; textbookId: string; progress: number; duration: number; videoProgress: number }
interface FocusItem { id: string; type: 'assignment' | 'exam'; title: string; subjectName: string; dueDate: string; urgency: 'overdue' | 'today' | 'tomorrow' | 'week'; label: string; link: string }
interface ClassEntry { id: string; time: string; subjectName: string; subjectColor: string; room: string; period: number }
interface ResultEntry { id: string; itemName: string; score: number; maxScore: number; percentage: number; gradedAt: string; feedback?: string }
interface AnnouncementEntry { id: string; type: 'teacher' | 'school'; title: string; body: string; createdAt: string; priority: 'high' | 'normal'; icon: string }
interface DashboardData { displayName: string; greeting: string; motivationalMessage: string; todayDate: string; streakCount: number; continueLearning: ContinueLearning | null; todayFocus: FocusItem[]; todayClasses: ClassEntry[]; recentResults: ResultEntry[]; announcements: AnnouncementEntry[] }

function getPeriodTime(period: number): string {
  const hour = period + 7;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour > 12 ? hour - 12 : hour}:00 ${ampm}`;
}

function getFocusUrgency(dueDate: string): { label: string; urgency: FocusItem['urgency'] } {
  const now = new Date(); const due = new Date(dueDate);
  now.setHours(0, 0, 0, 0); due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return { label: 'Overdue', urgency: 'overdue' };
  if (diffDays === 0) return { label: 'Due Today', urgency: 'today' };
  if (diffDays === 1) return { label: 'Tomorrow', urgency: 'tomorrow' };
  if (diffDays <= 7) return { label: `${diffDays} days left`, urgency: 'week' };
  return { label: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), urgency: 'week' };
}

const springTransition = { type: 'spring' as const, stiffness: 700, damping: 0.9 };

export default function StudentDashboardPage() {
  const authUser = useAuthStore((state) => state.user);
  const displayName = authUser?.displayName ?? mockUsers.student1.displayName;
  const classId = mockUsers.student1.classId;
  const studentId = mockUsers.student1.id;
  const todayDayName = dayNames[new Date().getDay()];
  const messageIndex = new Date().getDate() % motivationalMessages.length;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['student-dashboard', studentId],
    queryFn: async () => {
      const now = new Date();
      const greeting = getTimeGreeting();
      const streakCount = 7;
      const enrollments = mockEnrollments.filter((e) => e.studentId === studentId);
      const subjectIds = enrollments.map((e) => e.subjectId);
      const bestEnrollment = enrollments.length > 0 ? enrollments.reduce((best, e) => (e.progress > best.progress ? e : best)) : null;

      const allTextbooks = await getAllTextbooks();
      const readyTextbooks = allTextbooks.filter((tb) => tb.status !== 'processing');
      const tbSubjectMap = new Map(readyTextbooks.map((tb) => [tb.id, tb.subjectId]));

      const conceptProgressList = authUser?.id ? await getAllConceptProgress(authUser.id) : [];
      const inProgressConcepts = conceptProgressList
        .filter((p) => p.videoPosition > 0 || p.lessonCompleted)
        .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());

      let continueLearning: ContinueLearning | null = null;
      if (inProgressConcepts.length > 0) {
        const latest = inProgressConcepts[0];
        const foundTextbook = readyTextbooks.find((tb) =>
          tb.chapters?.some((ch) => ch.concepts?.some((c) => c.id === latest.conceptId)),
        );
        if (foundTextbook) {
          for (const ch of foundTextbook.chapters) {
            const foundConcept = ch.concepts?.find((c) => c.id === latest.conceptId);
            if (foundConcept) {
              const subject = mockSubjects.find((s) => s.id === foundTextbook.subjectId);
              const vidDuration = parseFloat(foundConcept.videos?.[0]?.duration ?? '0');
              const videoPct = vidDuration > 0
                ? Math.round((latest.videoPosition / vidDuration) * 100)
                : 0;
              continueLearning = {
                subjectName: subject?.name ?? '',
                subjectColor: subject?.color ?? '#6366f1',
                subjectIcon: subject?.icon ?? 'menu_book',
                textbookTitle: foundTextbook.title,
                chapterTitle: ch.title,
                lessonTitle: foundConcept.title,
                conceptId: latest.conceptId,
                textbookId: foundTextbook.id,
                progress: latest.lessonCompleted ? 100 : Math.min(videoPct, 99),
                duration: foundConcept.estimatedMinutes ?? 10,
                videoProgress: latest.videoPosition,
              };
              break;
            }
          }
        }
      }
      if (!continueLearning && bestEnrollment) {
        const subject = mockSubjects.find((s) => s.id === bestEnrollment.subjectId);
        if (subject) {
          const textbook = readyTextbooks.find((tb) => tb.subjectId === subject.id);
          if (textbook && textbook.chapters?.length) {
            const firstCh = textbook.chapters[0];
            const firstConcept = firstCh.concepts?.[0];
            if (firstConcept) {
              continueLearning = {
                subjectName: subject.name,
                subjectColor: subject.color ?? '#6366f1',
                subjectIcon: subject.icon ?? 'menu_book',
                textbookTitle: textbook.title,
                chapterTitle: firstCh.title,
                lessonTitle: firstConcept.title,
                conceptId: firstConcept.id,
                textbookId: textbook.id,
                progress: 0,
                duration: firstConcept.estimatedMinutes ?? 10,
                videoProgress: 0,
              };
            }
          }
        }
      }

      const todayFocus: FocusItem[] = [];
      const nowMs = now.getTime();

      for (const assignment of mockAssignments) {
        if ((assignment.status as string) === 'graded' || (assignment.status as string) === 'closed') continue;
        const assnSubjectId = tbSubjectMap.get(assignment.textbookId);
        if (!assnSubjectId || !subjectIds.includes(assnSubjectId)) continue;
        const diffDays = Math.ceil((new Date(assignment.dueDate).getTime() - nowMs) / 86400000);
        if (diffDays > 7) continue;
        const { label, urgency } = getFocusUrgency(assignment.dueDate);
        const subject = mockSubjects.find((s) => s.id === assnSubjectId);
        todayFocus.push({ id: assignment.id, type: 'assignment', title: assignment.title, subjectName: subject?.name ?? '', dueDate: assignment.dueDate, urgency, label, link: `/assignments/${assignment.id}` });
      }

      for (const exam of mockExams) {
        if ((exam.status as string) === 'completed' || (exam.status as string) === 'graded') continue;
        if (!subjectIds.includes(exam.subjectId)) continue;
        const diffDays = Math.ceil((new Date(exam.startDate).getTime() - nowMs) / 86400000);
        if (diffDays < 0 || diffDays > 7) continue;
        const { label, urgency } = getFocusUrgency(exam.startDate);
        const subject = mockSubjects.find((s) => s.id === exam.subjectId);
        todayFocus.push({ id: exam.id, type: 'exam', title: exam.title, subjectName: subject?.name ?? '', dueDate: exam.startDate, urgency, label, link: `/exams/${exam.id}` });
      }

      todayFocus.sort((a, b) => ({ overdue: 0, today: 1, tomorrow: 2, week: 3 })[a.urgency] - ({ overdue: 0, today: 1, tomorrow: 2, week: 3 })[b.urgency]);

      const timetableEntries: ClassEntry[] = mockTimetable
        .filter((tt) => tt.classId === classId && tt.day === todayDayName)
        .map((tt) => { const s = mockSubjects.find((sub) => sub.id === tt.subjectId); return { id: tt.id, time: getPeriodTime(tt.period), subjectName: s?.name ?? 'Unknown', subjectColor: s?.color ?? '#6366f1', room: tt.room, period: tt.period }; })
        .sort((a, b) => a.period - b.period);

      const grades: ResultEntry[] = mockGrades.filter((g) => g.studentId === studentId).map((g) => ({ id: g.id, itemName: g.itemName, score: g.score, maxScore: g.maxScore, percentage: g.percentage, gradedAt: g.gradedAt, feedback: (g as typeof mockGrades[number] & { feedback?: string }).feedback }));

      const announcements: AnnouncementEntry[] = mockAnnouncements.slice().sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (b.priority === 'high' && a.priority !== 'high') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      return {
        displayName, greeting, motivationalMessage: motivationalMessages[messageIndex],
        todayDate: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' } as const),
        streakCount, continueLearning, todayFocus, todayClasses: timetableEntries, recentResults: grades, announcements,
      } satisfies DashboardData;
    },
  });

  return (
    <>
      <SEOHead title="Dashboard" description="Your student learning dashboard" />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-4xl mx-auto space-y-5 pb-24">
        <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="detail">
          {(dash) => (
            <div className="space-y-5">
              <motion.div variants={listItem} initial="hidden" animate="show">
                <div className="flex flex-col gap-1">
                  <h1 className="text-headline-sm">{dash.greeting}, {dash.displayName.split(' ')[0]}</h1>
                  <p className="text-body-md text-on-surface-variant">{dash.todayDate}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-body-md italic text-on-surface-variant/80">{dash.motivationalMessage}</p>
                    <div className="flex items-center gap-1.5 bg-error-container px-3 py-1.5 rounded-full">
                      <Icon name="local_fire_department" size={18} className="text-error" />
                      <span className="text-label-sm font-semibold text-on-error-container">{dash.streakCount} day streak</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={listItem} initial="hidden" animate="show">
                {dash.continueLearning ? (
                  <Card className="overflow-hidden border-0">
                    <div className="relative p-5" style={{ background: `linear-gradient(135deg, ${dash.continueLearning.subjectColor}18, ${dash.continueLearning.subjectColor}06)` }}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${dash.continueLearning.subjectColor}22` }}>
                          <Icon name={dash.continueLearning.subjectIcon} size={28} style={{ color: dash.continueLearning.subjectColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-label-sm text-on-surface-variant mb-1">
                            <span>{dash.continueLearning.subjectName}</span>
                            <span className="text-outline">&middot;</span>
                            <span>{dash.continueLearning.textbookTitle}</span>
                          </div>
                          <h2 className="text-title-md font-semibold mb-0.5">{dash.continueLearning.chapterTitle}</h2>
                          <p className="text-body-md text-on-surface-variant">{dash.continueLearning.lessonTitle}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <div className="flex-1 max-w-xs"><Progress value={dash.continueLearning.progress} size="sm" indicatorClassName="bg-primary" /></div>
                            <span className="text-label-sm tabular-nums text-on-surface-variant">{dash.continueLearning.progress}%</span>
                          </div>
                          <p className="text-label-sm text-on-surface-variant/70 mt-1">
                            <Icon name="schedule" size={14} className="inline align-text-bottom mr-0.5" />
                            {dash.continueLearning.videoProgress > 0 ? `${Math.round((dash.continueLearning.progress))}% complete` : `${dash.continueLearning.duration} min`}
                          </p>
                        </div>
                        <Button asChild className="flex-shrink-0 w-full sm:w-auto">
                          <Link to={`${ROUTES.STUDENT_CONCEPT(dash.continueLearning.conceptId)}?textbookId=${dash.continueLearning.textbookId}`}>
                            <Icon name="play_arrow" size={16} className="mr-1.5" />Continue Learning
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card variant="filled" className="text-center py-10">
                    <CardContent className="flex flex-col items-center gap-3">
                      <div className="h-16 w-16 rounded-full bg-primary-container flex items-center justify-center">
                        <Icon name="auto_awesome" size={32} className="text-on-primary-container" />
                      </div>
                      <p className="text-title-md">Start Your Learning Journey</p>
                      <p className="text-body-md text-on-surface-variant max-w-sm">You are not enrolled in any subjects yet. Browse the catalog to get started.</p>
                      <Button asChild><Link to="/student/subjects"><Icon name="menu_book" size={16} className="mr-2" />Browse Subjects</Link></Button>
                    </CardContent>
                  </Card>
                )}
              </motion.div>

              <motion.div variants={listItem} initial="hidden" animate="show">
                <Card variant="elevated">
                  <CardHeader className="pb-3"><CardTitle className="text-title-lg flex items-center gap-2"><Icon name="checklist" size={20} />Today&rsquo;s Focus</CardTitle></CardHeader>
                  <CardContent>
                    {dash.todayFocus.length === 0 ? (
                      <div className="flex flex-col items-center py-6 text-center">
                        <Icon name="task_alt" size={32} className="text-on-surface-variant/50 mb-2" />
                        <p className="text-body-md text-on-surface-variant">All clear! Nothing due soon.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dash.todayFocus.map((item) => (
                          <Link key={item.id} to={item.link} className="block">
                            <motion.div whileHover={{ x: 4 }} transition={springTransition}>
                              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-variant/50 transition-colors">
                                <div className={cn('h-2 w-2 rounded-full flex-shrink-0', item.urgency === 'overdue' || item.urgency === 'today' ? 'bg-error' : item.urgency === 'tomorrow' ? 'bg-warning' : 'bg-primary')} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{item.title}</p>
                                  <p className="text-label-sm text-on-surface-variant">{item.type === 'exam' ? 'Exam' : 'Assignment'}{item.subjectName && ` \u00B7 ${item.subjectName}`}</p>
                                </div>
                                <Badge variant={item.urgency === 'overdue' || item.urgency === 'today' ? 'destructive' : item.urgency === 'tomorrow' ? 'warning' : 'info'} className="flex-shrink-0">{item.label}</Badge>
                              </div>
                            </motion.div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={listItem} initial="hidden" animate="show">
                <Card variant="elevated">
                  <CardHeader className="pb-3"><CardTitle className="text-title-lg flex items-center gap-2"><Icon name="schedule" size={20} />Today&rsquo;s Classes</CardTitle></CardHeader>
                  <CardContent>
                    {dash.todayClasses.length === 0 ? (
                      <div className="flex flex-col items-center py-6 text-center">
                        <Icon name="event_busy" size={32} className="text-on-surface-variant/50 mb-2" />
                        <p className="text-body-md text-on-surface-variant">No classes today. Enjoy your day off!</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {dash.todayClasses.map((entry) => (
                          <motion.div key={entry.id} whileHover={{ x: 4 }} transition={springTransition}>
                            <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-surface-variant/50 transition-colors cursor-default">
                              <div className="flex flex-col items-center min-w-[4rem]"><span className="text-label-sm font-semibold text-on-surface-variant">{entry.time}</span></div>
                              <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${entry.subjectColor}18` }}>
                                <Icon name="school" size={20} style={{ color: entry.subjectColor }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{entry.subjectName}</p>
                                <p className="text-label-sm text-on-surface-variant">Room {entry.room}</p>
                              </div>
                              <Icon name="chevron_right" size={18} className="text-on-surface-variant/40 flex-shrink-0" />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={listItem} initial="hidden" animate="show">
                <Card variant="elevated">
                  <CardHeader className="pb-3"><CardTitle className="text-title-lg flex items-center gap-2"><Icon name="grade" size={20} />Recent Results</CardTitle></CardHeader>
                  <CardContent>
                    {dash.recentResults.length === 0 ? (
                      <div className="flex flex-col items-center py-6 text-center">
                        <Icon name="rate_review" size={32} className="text-on-surface-variant/50 mb-2" />
                        <p className="text-body-md text-on-surface-variant">No results yet. Complete assignments to see your grades here.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dash.recentResults.map((result) => {
                          const colorClass = result.percentage >= 80 ? 'text-success bg-success-container/30' : result.percentage >= 60 ? 'text-warning bg-warning-container/30' : 'text-error bg-error-container/30';
                          return (
                            <motion.div key={result.id} whileHover={{ x: 4 }} transition={springTransition}>
                              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-variant/50 transition-colors">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{result.itemName}</p>
                                  <p className="text-label-sm text-on-surface-variant">{result.score}/{result.maxScore}{result.feedback && <span className="ml-2 text-on-surface-variant/60">&middot; {result.feedback}</span>}</p>
                                </div>
                                <div className={cn('h-9 min-w-[3rem] px-2 rounded-lg flex items-center justify-center text-label-sm font-semibold', colorClass)}>{result.percentage}%</div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {dash.announcements.length > 0 && (
                <motion.div variants={listItem} initial="hidden" animate="show">
                  <Card variant="elevated">
                    <CardHeader className="pb-3"><CardTitle className="text-title-lg flex items-center gap-2"><Icon name="campaign" size={20} />Announcements</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {dash.announcements.map((ann) => (
                        <motion.div key={ann.id} whileHover={{ x: 4 }} transition={springTransition}>
                          <div className={cn('flex items-start gap-3 p-3 rounded-xl transition-colors', ann.priority === 'high' ? 'bg-primary-container/30 border-l-4 border-l-primary' : 'hover:bg-surface-variant/50')}>
                            <div className="h-9 w-9 rounded-xl bg-surface-variant flex items-center justify-center flex-shrink-0">
                              <Icon name={ann.icon} size={18} className="text-on-surface-variant" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{ann.title}</p>
                                {ann.priority === 'high' && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Priority</Badge>}
                              </div>
                              <p className="text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">{ann.body}</p>
                              <p className="text-label-sm text-on-surface-variant/50 mt-1">{ann.type === 'school' ? 'School Admin' : 'Teacher'} &middot; {formatRelativeTime(ann.createdAt)}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
