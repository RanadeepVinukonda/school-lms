import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Icon } from '@/components/ui/Icon';
import { pageTransition } from '@/lib/motion';
import { useQuery } from '@tanstack/react-query';
import { mockTextbooks, mockLessons, mockAssignments, mockQuizzes, mockSubjects } from '@/lib/mockData';
import { ROUTES } from '@/lib/constants';

export default function LessonViewPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
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

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : isError || !data ? (
          <Card><CardContent className="flex flex-col items-center gap-4 py-12">
            <Icon name="error" size={32} className="text-destructive" />
            <p className="font-semibold">Lesson not found</p>
            <Button asChild><Link to={ROUTES.STUDENT_SUBJECTS}>Back to Subjects</Link></Button>
          </CardContent></Card>
        ) : (
          <>
            {/* Lesson Header */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {data.subject?.name} &middot; {data.textbook?.title}
              </p>
              <h1 className="text-2xl font-bold">{data.lesson.title}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Icon name="schedule" size={16} />{data.lesson.duration} min</span>
                {data.lesson.contentType === 'video' && (
                  <span className="flex items-center gap-1"><Icon name="smart_display" size={16} />Video</span>
                )}
              </div>
            </div>

            {/* Video Section */}
            {data.lesson.videoUrl && (
              <Card>
                <CardContent className="p-0 overflow-hidden rounded-xl">
                  <div className="aspect-video w-full">
                    <iframe
                      src={data.lesson.videoUrl}
                      title={data.lesson.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Content text */}
            {data.lesson.content && (
              <Card>
                <CardContent className="p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {data.lesson.content}
                </CardContent>
              </Card>
            )}

            {/* Quiz + Assignment Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.quiz ? (
                <Card className="border-l-4 border-l-emerald-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon name="quiz" size={18} className="text-emerald-600" />
                      Quiz: {data.quiz.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{data.quiz.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Icon name="schedule" size={14} />{data.quiz.timeLimit} min</span>
                      <span className="flex items-center gap-1"><Icon name="help" size={14} />{data.quiz.questions.length} questions</span>
                    </div>
                    <Button asChild className="w-full gap-2">
                      <Link to={`/quizzes/${data.quiz.id}/attempt`}>
                        <Icon name="play_arrow" size={16} />
                        Start Quiz
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-l-4 border-l-muted opacity-60">
                  <CardContent className="flex items-center gap-3 py-6">
                    <Icon name="quiz" size={24} className="text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No quiz for this lesson</p>
                  </CardContent>
                </Card>
              )}

              {data.assignment ? (
                <Card className="border-l-4 border-l-amber-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon name="assignment" size={18} className="text-amber-600" />
                      Assignment: {data.assignment.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{data.assignment.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Icon name="event" size={14} />Due {new Date(data.assignment.dueDate).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Icon name="score" size={14} />{data.assignment.maxPoints} pts</span>
                    </div>
                    <Button asChild className="w-full gap-2" variant={data.assignment.status === 'published' ? 'default' : 'secondary'}>
                      <Link to={`/assignments/${data.assignment.id}`}>
                        <Icon name="description" size={16} />
                        {data.assignment.status === 'published' ? 'Submit Assignment' : 'View Assignment'}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-l-4 border-l-muted opacity-60">
                  <CardContent className="flex items-center gap-3 py-6">
                    <Icon name="assignment" size={24} className="text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No assignment for this lesson</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}