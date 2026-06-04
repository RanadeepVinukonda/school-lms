import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { pageTransition, listItem } from '@/lib/motion';
import { useQuery } from '@tanstack/react-query';
import { mockSubjects, mockTextbooks, mockLessons, mockAssignments, mockQuizzes } from '@/lib/mockData';
import { ROUTES } from '@/lib/constants';

export default function TextbookDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['textbook', id],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      if (!id) return null;
      const textbook = mockTextbooks.find((tb) => tb.id === id);
      if (!textbook) return null;
      const subject = mockSubjects.find((s) => s.id === textbook.subjectId);
      const lessons = mockLessons.filter((l) => l.textbookId === id);
      const quizzes = mockQuizzes.filter((q) => q.textbookId === id);
      const assignments = mockAssignments.filter((a) => a.textbookId === id);
      const grouped = textbook.chapters.map((ch) => ({
        ...ch,
        lessons: lessons.filter((l) => l.chapterId === ch.id),
        quizzes: quizzes.filter((q) => q.chapterId === ch.id),
        assignments: assignments.filter((a) => a.chapterId === ch.id),
      }));
      return { textbook, subject, chapters: grouped, lessons, quizzes, assignments };
    },
  });

  return (
    <>
      <SEOHead title={data?.textbook?.title ?? 'Textbook'} description={`${data?.textbook?.title ?? 'Textbook'} lessons and materials`} />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-4xl mx-auto space-y-4 pb-20">
        <Button variant="ghost" size="sm" asChild className="mb-1">
          <Link to={data?.subject ? ROUTES.STUDENT_SUBJECT(data.subject.id) : ROUTES.STUDENT_SUBJECTS} className="gap-2">
            <Icon name="arrow_back" size={16} />
            {data?.subject ? `Back to ${data.subject.name}` : 'Back to Subjects'}
          </Link>
        </Button>

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Failed to load textbook') : null}
          loadingType="detail"
          emptyMessage="Textbook not found"
          emptyIcon={<Icon name="auto_stories" size={32} />}
          emptyAction={
            <Button asChild>
              <Link to={ROUTES.STUDENT_SUBJECTS}>Back to Subjects</Link>
            </Button>
          }
          onRetry={() => refetch()}
          errorTitle="Failed to load textbook"
        >
          {(d) => (
            <>
              <motion.div variants={listItem} initial="hidden" animate="show">
                <Card variant="elevated" className="overflow-hidden">
                  <div className="h-32 flex items-end p-6 relative" style={{ backgroundColor: `${d.subject?.color || '#6366f1'}20` }}>
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: d.subject?.color || '#6366f1' }}>
                        <Icon name="auto_stories" size={28} className="text-white" />
                      </div>
                      <div>
                        <h1 className="text-xl font-bold">{d.textbook.title}</h1>
                        <p className="text-body-md text-muted-foreground">{d.subject?.name} &middot; {d.lessons.length} lessons</p>
                        {d.textbook.description && (
                          <p className="text-body-sm text-muted-foreground mt-0.5">{d.textbook.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {d.chapters.map((ch, ci) => (
                <motion.div key={ch.id} variants={listItem} initial="hidden" animate="show" transition={{ delay: ci * 0.05 }}>
                  <Card variant="elevated">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-title-md flex items-center gap-2">
                          <Icon name="auto_stories" size={18} className="text-muted-foreground" />
                          Chapter {ch.order}: {ch.title}
                        </CardTitle>
                        <Badge variant="secondary" className="text-[10px]">{ch.lessons.length} lessons</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {ch.lessons.length === 0 ? (
                        <p className="text-body-md text-muted-foreground italic">No lessons published yet.</p>
                      ) : (
                        ch.lessons.map((lesson, li) => {
                          const lessonQuiz = ch.quizzes.find((q) => q.lessonId === lesson.id);
                          const lessonAssignment = ch.assignments.find((a) => a.lessonId === lesson.id);
                          return (
                            <motion.div
                              key={lesson.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: li * 0.04 }}
                            >
                              <Link
                                to={ROUTES.STUDENT_LESSON(lesson.id)}
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors group"
                              >
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                  <Icon name={lesson.contentType === 'video' ? 'smart_display' : 'article'} size={20} className="text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{lesson.title}</p>
                                  <div className="flex items-center flex-wrap gap-2 mt-1">
                                    <span className="text-body-sm text-muted-foreground flex items-center gap-1">
                                      <Icon name="schedule" size={12} />
                                      {lesson.duration} min
                                    </span>
                                    {lesson.quizId && (
                                      <span className="text-body-sm text-success flex items-center gap-1">
                                        <Icon name="quiz" size={12} />
                                        Quiz
                                      </span>
                                    )}
                                    {lesson.assignmentId && (
                                      <span className="text-body-sm text-warning flex items-center gap-1">
                                        <Icon name="assignment" size={12} />
                                        Assignment
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {lesson.quizId && (
                                    <span className="h-2 w-2 rounded-full bg-success" title="Has quiz" />
                                  )}
                                  {lesson.assignmentId && (
                                    <span className="h-2 w-2 rounded-full bg-warning" title="Has assignment" />
                                  )}
                                  <Icon name="chevron_right" size={18} className="text-muted-foreground flex-shrink-0" />
                                </div>
                              </Link>
                            </motion.div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
