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
import { getAllTextbooks, getAllConceptProgress } from '@/services/textbookService';
import { getAllSubjects, getEnrollmentsByStudent, getGradesByStudent } from '@/services/dataService';
import { ROUTES } from '@/lib/constants';

const motivationalMessages = [
  'Every expert was once a beginner. Keep going!',
  'The secret of getting ahead is getting started.',
  'Education is the most powerful weapon to change the world.',
  'The beautiful thing about learning is that no one can take it away from you.',
  'Success is the sum of small efforts repeated day in and day out.',
  'Believe you can and you\u2019re halfway there.',
];

interface ContinueLearning { subjectName: string; subjectColor: string; subjectIcon: string; textbookTitle: string; chapterTitle: string; lessonTitle: string; conceptId: string; textbookId: string; progress: number; duration: number; videoProgress: number }
interface ResultEntry { id: string; itemName: string; score: number; maxScore: number; percentage: number; gradedAt: string; feedback?: string }
interface DashboardData { displayName: string; greeting: string; motivationalMessage: string; todayDate: string; streakCount: number; continueLearning: ContinueLearning | null; recentResults: ResultEntry[] }

export default function StudentDashboardPage() {
  const authUser = useAuthStore((state) => state.user);
  const displayName = authUser?.displayName ?? 'Student';
  const studentId = authUser?.id;
  const messageIndex = new Date().getDate() % motivationalMessages.length;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['student-dashboard', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const now = new Date();
      const greeting = getTimeGreeting();
      const streakCount = 7;

      const [allSubjects, allTextbooks, conceptProgressList, enrollments, grades] = await Promise.all([
        getAllSubjects(),
        getAllTextbooks(),
        studentId ? getAllConceptProgress(studentId) : Promise.resolve([]),
        studentId ? getEnrollmentsByStudent(studentId) : Promise.resolve([]),
        studentId ? getGradesByStudent(studentId) : Promise.resolve([]),
      ]);

      const subjectMap = new Map(allSubjects.map((s) => [s.id, s]));
      const readyTextbooks = allTextbooks.filter((tb) => tb.status !== 'processing');
      const enrolledSubjectIds = new Set(enrollments.map((e) => e.courseId));

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
              const subject = subjectMap.get(foundTextbook.subjectId);
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
      if (!continueLearning && readyTextbooks.length > 0) {
        const firstTb = readyTextbooks[0];
        const subject = subjectMap.get(firstTb.subjectId);
        if (firstTb.chapters?.length) {
          const firstCh = firstTb.chapters[0];
          const firstConcept = firstCh.concepts?.[0];
          if (firstConcept) {
            continueLearning = {
              subjectName: subject?.name ?? '',
              subjectColor: subject?.color ?? '#6366f1',
              subjectIcon: subject?.icon ?? 'menu_book',
              textbookTitle: firstTb.title,
              chapterTitle: firstCh.title,
              lessonTitle: firstConcept.title,
              conceptId: firstConcept.id,
              textbookId: firstTb.id,
              progress: 0,
              duration: firstConcept.estimatedMinutes ?? 10,
              videoProgress: 0,
            };
          }
        }
      }

      const recentResults: ResultEntry[] = grades
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map((g) => ({
          id: g.id,
          itemName: g.itemName ?? 'Assessment',
          score: g.score,
          maxScore: g.totalPoints,
          percentage: g.percentage,
          gradedAt: g.createdAt,
          feedback: g.feedback,
        }));

      return {
        displayName, greeting, motivationalMessage: motivationalMessages[messageIndex],
        todayDate: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        streakCount, continueLearning, recentResults,
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
                            {dash.continueLearning.videoProgress > 0 ? `${Math.round(dash.continueLearning.progress)}% complete` : `${dash.continueLearning.duration} min`}
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
                      <p className="text-body-md text-on-surface-variant max-w-sm">No textbooks available yet.</p>
                      <Button asChild><Link to="/student/subjects"><Icon name="menu_book" size={16} className="mr-2" />Browse Subjects</Link></Button>
                    </CardContent>
                  </Card>
                )}
              </motion.div>

              <motion.div variants={listItem} initial="hidden" animate="show">
                <Card variant="elevated">
                  <CardHeader className="pb-3"><CardTitle className="text-title-lg flex items-center gap-2"><Icon name="grade" size={20} />Recent Results</CardTitle></CardHeader>
                  <CardContent>
                    {dash.recentResults.length === 0 ? (
                      <div className="flex flex-col items-center py-6 text-center">
                        <Icon name="rate_review" size={32} className="text-on-surface-variant/50 mb-2" />
                        <p className="text-body-md text-on-surface-variant">No results yet. Complete assessments to see your grades here.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dash.recentResults.map((result) => {
                          const colorClass = result.percentage >= 80 ? 'text-success bg-success-container/30' : result.percentage >= 60 ? 'text-warning bg-warning-container/30' : 'text-error bg-error-container/30';
                          return (
                            <motion.div key={result.id} whileHover={{ x: 4 }} transition={{ type: 'spring', stiffness: 700, damping: 0.9 }}>
                              <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-variant/50 transition-colors">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{result.itemName}</p>
                                  <p className="text-label-sm text-on-surface-variant">{result.score}/{result.maxScore}{result.feedback ? <span className="ml-2 text-on-surface-variant/60">&middot; {result.feedback}</span> : null}</p>
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
            </div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
