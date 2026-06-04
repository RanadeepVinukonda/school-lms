import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@/components/ui/Icon';
import { pageTransition, listItem } from '@/lib/motion';
import { useQuery } from '@tanstack/react-query';
import { mockUsers, mockEnrollments, mockSubjects, mockTextbooks, mockLessons, mockAssignments, mockExams, mockGrades, mockTimetable } from '@/lib/mockData';
import { ROUTES } from '@/lib/constants';

interface DashboardData {
  subject: (typeof mockSubjects)[number];
  teacher: (typeof mockUsers)[keyof typeof mockUsers] | null;
  enrollment: (typeof mockEnrollments)[number] | null;
  currentChapter: { textbookId: string; textbookTitle: string; id: string; title: string; order: number; lessonCount: number } | null;
  nextLesson: (typeof mockLessons)[number] | null;
  upcomingAssignment: (typeof mockAssignments)[number] | null;
  upcomingExam: (typeof mockExams)[number] | null;
  recentGrade: (typeof mockGrades)[number] | null;
  textbooks: Array<(typeof mockTextbooks)[number] & { chapterCount: number }>;
}

export default function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = useQuery<DashboardData | null>({
    queryKey: ['subject-detail', id],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      if (!id) return null;
      const subject = mockSubjects.find((s) => s.id === id);
      if (!subject) return null;
      const student = mockUsers.student1;
      const timetableSlot = mockTimetable.find((tt) => tt.classId === student.classId && tt.subjectId === id);
      const teacher = timetableSlot ? Object.values(mockUsers).find((u) => u.id === timetableSlot.teacherId) ?? null : null;
      const enrollment = mockEnrollments.find((e) => e.studentId === student.id && e.subjectId === id) ?? null;
      const textbooks = mockTextbooks.filter((tb) => tb.subjectId === id).map((tb) => ({ ...tb, chapterCount: tb.chapters.length }));
      const firstTb = textbooks[0];
      const currentChapter = firstTb?.chapters[0]
        ? { textbookId: firstTb.id, textbookTitle: firstTb.title, ...firstTb.chapters[0] }
        : null;
      const nextLesson = currentChapter
        ? mockLessons.find((l) => l.textbookId === currentChapter.textbookId && l.chapterId === currentChapter.id) ?? null
        : null;
      const subjectTextbookIds = mockTextbooks.filter((tb) => tb.subjectId === id).map((tb) => tb.id);
      const upcomingAssignment = mockAssignments
        .filter((a) => subjectTextbookIds.includes(a.textbookId) && new Date(a.dueDate) > new Date())
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] ?? null;
      const upcomingExam = mockExams.find((e) => e.subjectId === id) ?? null;
      const recentGrade = mockGrades
        .filter((g) => g.studentId === student.id && g.subjectId === id)
        .sort((a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime())[0] ?? null;
      return { subject, teacher, enrollment, currentChapter, nextLesson, upcomingAssignment, upcomingExam, recentGrade, textbooks };
    },
  });

  return (
    <>
      <SEOHead title={data?.subject?.name ?? 'Subject'} description={`${data?.subject?.name ?? 'Subject'} dashboard overview`} />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-4xl mx-auto space-y-6 pb-20">
        <Button variant="ghost" size="sm" asChild className="mb-1">
          <Link to={ROUTES.STUDENT_SUBJECTS} className="gap-2">
            <Icon name="arrow_back" size={16} /> Back to Subjects
          </Link>
        </Button>
        <DataFetchWrapper data={data} isLoading={isLoading} error={isError ? error ?? new Error('Failed to load subject') : null}
          loadingType="detail" emptyMessage="Subject not found" emptyIcon={<Icon name="menu_book" size={32} />}
          emptyAction={<Button asChild><Link to={ROUTES.STUDENT_SUBJECTS}><Icon name="arrow_back" size={16} className="mr-2" /> Back to Subjects</Link></Button>}
          onRetry={() => refetch()} errorTitle="Failed to load subject"
        >
          {(d) => (
            <>
              {/* Banner */}
              <motion.div variants={listItem} initial="hidden" animate="show">
                <Card className="overflow-hidden border-0">
                  <div className="relative p-6 pb-12" style={{ background: `linear-gradient(135deg, ${d.subject.color}33 0%, transparent 100%)` }}>
                    <div className="absolute inset-0" style={{ backgroundColor: d.subject.color, opacity: 0.06 }} />
                    <div className="relative z-10 flex items-start gap-5">
                      <div className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg shrink-0" style={{ backgroundColor: d.subject.color }}>
                        <Icon name={d.subject.icon} size={32} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h1 className="text-2xl font-bold" style={{ color: d.subject.color }}>{d.subject.name}</h1>
                        <p className="text-body-md text-muted-foreground">{d.subject.code}</p>
                        {d.teacher && <p className="text-body-sm text-muted-foreground mt-1 flex items-center gap-1.5"><Icon name="person" size={14} /> {d.teacher.displayName}</p>}
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="secondary" className="text-[10px]">{d.subject.category}</Badge>
                          {d.enrollment && <Badge variant="info" className="text-[10px]">{d.enrollment.status}</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                  {d.enrollment && (
                    <CardContent className="px-6 pb-5 pt-0 -mt-5 relative z-10">
                      <div className="flex items-center gap-3 bg-background/80 backdrop-blur-sm rounded-lg p-3 shadow-sm border">
                        <Progress value={d.enrollment.progress} className="flex-1 h-2.5" />
                        <span className="text-sm font-medium tabular-nums shrink-0">{d.enrollment.progress}% complete</span>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>

              {/* Info grid */}
              <motion.div variants={listItem} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card variant="elevated" className="overflow-hidden">
                  <div className="h-1.5" style={{ backgroundColor: d.subject.color }} />
                  <CardContent className="p-4">
                    <p className="text-body-sm font-medium flex items-center gap-2 mb-2"><Icon name="auto_stories" size={16} /> Current Chapter</p>
                    {d.currentChapter ? (
                      <Link to={ROUTES.STUDENT_TEXTBOOK(d.currentChapter.textbookId)} className="block group">
                        <p className="font-semibold group-hover:underline truncate">{d.currentChapter.title}</p>
                        <p className="text-body-sm text-muted-foreground">{d.currentChapter.textbookTitle} &middot; {d.currentChapter.lessonCount} lessons</p>
                      </Link>
                    ) : <p className="text-body-sm text-muted-foreground">No chapters yet</p>}
                  </CardContent>
                </Card>

                <Card variant="elevated" className="overflow-hidden">
                  <div className="h-1.5" style={{ backgroundColor: d.subject.color }} />
                  <CardContent className="p-4">
                    <p className="text-body-sm font-medium flex items-center gap-2 mb-2"><Icon name="play_circle" size={16} /> Next Lesson</p>
                    {d.nextLesson ? (
                      <Link to={ROUTES.STUDENT_LESSON(d.nextLesson.id)} className="block group">
                        <p className="font-semibold group-hover:underline truncate">{d.nextLesson.title}</p>
                        <p className="text-body-xs text-muted-foreground flex items-center gap-1"><Icon name="schedule" size={12} /> {d.nextLesson.duration} min &middot; {d.nextLesson.contentType}</p>
                      </Link>
                    ) : <p className="text-body-sm text-muted-foreground">No upcoming lessons</p>}
                  </CardContent>
                </Card>

                <Card variant="elevated" className="overflow-hidden">
                  <div className="h-1.5" style={{ backgroundColor: d.subject.color }} />
                  <CardContent className="p-4">
                    <p className="text-body-sm font-medium flex items-center gap-2 mb-2"><Icon name="assignment" size={16} /> Upcoming Assignment</p>
                    {d.upcomingAssignment ? (
                      <div>
                        <p className="font-semibold truncate">{d.upcomingAssignment.title}</p>
                        <p className="text-body-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Icon name="calendar_today" size={12} /> Due {new Date(d.upcomingAssignment.dueDate).toLocaleDateString()} &middot; {d.upcomingAssignment.points} pts</p>
                      </div>
                    ) : <p className="text-body-sm text-muted-foreground">No pending assignments</p>}
                  </CardContent>
                </Card>

                <Card variant="elevated" className="overflow-hidden">
                  <div className="h-1.5" style={{ backgroundColor: d.subject.color }} />
                  <CardContent className="p-4">
                    <p className="text-body-sm font-medium flex items-center gap-2 mb-2"><Icon name="fact_check" size={16} /> Upcoming Exam</p>
                    {d.upcomingExam ? (
                      <div>
                        <p className="font-semibold truncate">{d.upcomingExam.title}</p>
                        <p className="text-body-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Icon name="calendar_today" size={12} /> {new Date(d.upcomingExam.startDate).toLocaleDateString()} &middot; {d.upcomingExam.duration} min &middot; {d.upcomingExam.questions.length} questions</p>
                      </div>
                    ) : <p className="text-body-sm text-muted-foreground">No exams scheduled</p>}
                  </CardContent>
                </Card>

                <Card variant="elevated" className="overflow-hidden sm:col-span-2">
                  <div className="h-1.5" style={{ backgroundColor: d.subject.color }} />
                  <CardContent className="p-4">
                    <p className="text-body-sm font-medium flex items-center gap-2 mb-2"><Icon name="grading" size={16} /> Recent Grade</p>
                    {d.recentGrade ? (
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{d.recentGrade.itemName}</p>
                          <p className="text-body-xs text-muted-foreground">{d.recentGrade.type} &middot; {new Date(d.recentGrade.gradedAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-lg font-bold" style={{ color: d.recentGrade.percentage >= 70 ? '#16a34a' : '#dc2626' }}>
                            {d.recentGrade.score}/{d.recentGrade.maxScore}
                          </p>
                          <p className="text-body-xs text-muted-foreground">{d.recentGrade.percentage}%</p>
                        </div>
                      </div>
                    ) : <p className="text-body-sm text-muted-foreground">No grades yet</p>}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Textbooks section */}
              <motion.div variants={listItem} initial="hidden" animate="show">
                <h2 className="text-title-sm font-semibold mb-3 flex items-center gap-2"><Icon name="menu_book" size={20} /> Textbooks</h2>
                {d.textbooks.length === 0 ? (
                  <Card variant="elevated">
                    <CardContent className="flex flex-col items-center gap-3 py-10">
                      <Icon name="auto_stories" size={40} className="text-muted-foreground/50" />
                      <p className="text-body-md text-muted-foreground">No textbooks available yet for this subject.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {d.textbooks.map((tb, idx) => (
                      <motion.div key={tb.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}>
                        <Link to={ROUTES.STUDENT_TEXTBOOK(tb.id)} className="block h-full">
                          <Card variant="elevated" className="h-full hover:shadow-elevation-3 hover:-translate-y-1 transition-all duration-200 overflow-hidden">
                            <div className="h-2" style={{ backgroundColor: d.subject.color }} />
                            <CardContent className="p-5 flex flex-col gap-3">
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: `${d.subject.color}18` }}>
                                  <Icon name="auto_stories" size={24} style={{ color: d.subject.color }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold truncate">{tb.title}</p>
                                  <p className="text-body-sm text-muted-foreground">{d.subject.code}</p>
                                </div>
                              </div>
                              {tb.description && <p className="text-body-sm text-muted-foreground line-clamp-2">{tb.description}</p>}
                              <p className="text-body-sm text-muted-foreground flex items-center gap-1">
                                <Icon name="auto_stories" size={14} /> {tb.chapterCount} {tb.chapterCount === 1 ? 'chapter' : 'chapters'}
                              </p>
                            </CardContent>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Quick actions */}
              <motion.div variants={listItem} initial="hidden" animate="show" className="flex flex-wrap gap-3 pt-2">
                {d.nextLesson && (
                  <Button asChild className="gap-2">
                    <Link to={ROUTES.STUDENT_LESSON(d.nextLesson.id)}><Icon name="play_arrow" size={18} /> Continue Learning</Link>
                  </Button>
                )}
                {d.textbooks.length > 0 && (
                  <Button variant="outline" asChild className="gap-2">
                    <Link to={ROUTES.STUDENT_TEXTBOOK(d.textbooks[0].id)}><Icon name="menu_book" size={18} /> View Textbooks</Link>
                  </Button>
                )}
              </motion.div>
            </>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
