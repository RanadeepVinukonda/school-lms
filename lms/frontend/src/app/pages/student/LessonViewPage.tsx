import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { pageTransition } from '@/lib/motion';
import { useQuery } from '@tanstack/react-query';
import { mockTextbooks, mockLessons, mockAssignments, mockQuizzes, mockSubjects } from '@/lib/mockData';
import { ROUTES } from '@/lib/constants';

export default function LessonViewPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['lesson', id],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      if (!id) return null;
      const lesson = mockLessons.find((l) => l.id === id);
      if (!lesson) return null;
      const textbook = mockTextbooks.find((tb) => tb.id === lesson.textbookId);
      const subject = textbook ? mockSubjects.find((s) => s.id === textbook.subjectId) : null;
      const quiz = lesson.quizId ? mockQuizzes.find((q) => q.id === lesson.quizId) : null;
      const assignment = lesson.assignmentId ? mockAssignments.find((a) => a.id === lesson.assignmentId) : null;
      return { lesson, textbook, subject, quiz, assignment };
    },
  });

  return (
    <>
      <SEOHead title={data?.lesson?.title ?? 'Lesson'} description={`Watch video and complete quiz for ${data?.lesson?.title ?? 'lesson'}`} />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-4xl mx-auto space-y-4 pb-20">
        <Button variant="ghost" size="sm" asChild className="mb-1">
          <Link
            to={data?.textbook ? ROUTES.STUDENT_TEXTBOOK(data.textbook.id) : ROUTES.STUDENT_SUBJECTS}
            className="gap-2"
          >
            <Icon name="arrow_back" size={16} />
            {data?.textbook?.title ?? 'Back'}
          </Link>
        </Button>

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Lesson not found') : null}
          loadingType="detail"
          emptyMessage="Lesson not found"
          emptyIcon={<Icon name="error" size={32} />}
          emptyAction={
            <Button asChild>
              <Link to={ROUTES.STUDENT_SUBJECTS}>Back to Subjects</Link>
            </Button>
          }
          onRetry={() => refetch()}
          errorTitle="Failed to load lesson"
        >
          {(d) => (
            <>
              <div>
                <p className="text-body-sm text-muted-foreground mb-1">
                  {d.subject?.name} &middot; {d.textbook?.title}
                </p>
                <h1 className="text-headline-sm font-bold">{d.lesson.title}</h1>
                <div className="flex items-center gap-3 mt-1 text-body-md text-muted-foreground">
                  <span className="flex items-center gap-1"><Icon name="schedule" size={16} />{d.lesson.duration} min</span>
                  {d.lesson.contentType === 'video' && (
                    <span className="flex items-center gap-1"><Icon name="smart_display" size={16} />Video</span>
                  )}
                </div>
              </div>

              {d.lesson.videoUrl && (
                <Card variant="elevated">
                  <CardContent className="p-0 overflow-hidden rounded-xl">
                    <div className="aspect-video w-full">
                      <iframe
                        src={d.lesson.videoUrl}
                        title={d.lesson.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {d.lesson.content && (
                <Card variant="elevated">
                  <CardContent className="p-4 text-body-md leading-relaxed whitespace-pre-wrap">
                    {d.lesson.content}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {d.quiz ? (
                  <Card variant="elevated" className="border-l-4 border-l-success">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Icon name="quiz" size={18} className="text-success" />
                        Quiz: {d.quiz.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-body-md text-muted-foreground">{d.quiz.description}</p>
                      <div className="flex items-center gap-3 text-body-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Icon name="schedule" size={14} />{d.quiz.timeLimit} min</span>
                        <span className="flex items-center gap-1"><Icon name="help" size={14} />{d.quiz.questions.length} questions</span>
                      </div>
                      <Button asChild className="w-full gap-2">
                        <Link to={`/quizzes/${d.quiz.id}/attempt`}>
                          <Icon name="play_arrow" size={16} />
                          Start Quiz
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card variant="elevated" className="border-l-4 border-l-outline-variant opacity-60">
                    <CardContent className="flex items-center gap-3 py-6">
                      <Icon name="quiz" size={24} className="text-muted-foreground" />
                      <p className="text-body-md text-muted-foreground">No quiz for this lesson</p>
                    </CardContent>
                  </Card>
                )}

                {d.assignment ? (
                  <Card variant="elevated" className="border-l-4 border-l-warning">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Icon name="assignment" size={18} className="text-warning" />
                        Assignment: {d.assignment.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-body-md text-muted-foreground">{d.assignment.description}</p>
                      <div className="flex items-center gap-3 text-body-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Icon name="event" size={14} />Due {new Date(d.assignment.dueDate).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Icon name="score" size={14} />{d.assignment.points} pts</span>
                      </div>
                      <Button asChild className="w-full gap-2" variant={d.assignment.status === 'published' ? 'default' : 'secondary'}>
                        <Link to={`/assignments/${d.assignment.id}`}>
                          <Icon name="description" size={16} />
                          {d.assignment.status === 'published' ? 'Submit Assignment' : 'View Assignment'}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card variant="elevated" className="border-l-4 border-l-outline-variant opacity-60">
                    <CardContent className="flex items-center gap-3 py-6">
                      <Icon name="assignment" size={24} className="text-muted-foreground" />
                      <p className="text-body-md text-muted-foreground">No assignment for this lesson</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
