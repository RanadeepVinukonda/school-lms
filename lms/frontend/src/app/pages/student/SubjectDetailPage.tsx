import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { pageTransition, listContainer, listItem, springTransition } from '@/lib/motion';
import { useQuery } from '@tanstack/react-query';
import {
  mockUsers,
  mockEnrollments,
  mockSubjects,
  mockTextbooks,
  mockLessons,
  mockAssignments,
  mockQuizzes,
  mockTimetable,
} from '@/lib/mockData';

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-44 rounded-xl" />
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function ErrorDisplay({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Icon name="error" size={32} className="text-destructive" />
        </div>
        <p className="text-lg font-semibold">Failed to load subject</p>
        <p className="text-sm text-muted-foreground">Please check your connection and try again</p>
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <Icon name="refresh" size={16} />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyDisplay() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <Icon name="menu_book" size={32} className="text-muted-foreground" />
        </div>
        <p className="text-lg font-semibold">Subject not found</p>
        <p className="text-sm text-muted-foreground">The subject you are looking for does not exist.</p>
        <Button asChild>
          <Link to="/student/subjects">
            <Icon name="arrow_back" size={16} className="mr-2" />
            Back to Subjects
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [expandedTextbook, setExpandedTextbook] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['subject-detail', id],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      if (!id) return null;

      const subject = mockSubjects.find((s) => s.id === id);
      if (!subject) return null;

      const student = mockUsers.student1;
      const enrollment = mockEnrollments.find((e) => e.studentId === student.id && e.subjectId === id);
      const textbooks = mockTextbooks.filter((tb) => tb.subjectId === id);
      const assignments = mockAssignments.filter((a) => a.courseId === id);
      const quizzes = mockQuizzes.filter((q) => q.courseId === id);

      // Derive teacher info from timetable for this class + subject
      const timetableSlot = mockTimetable.find(
        (tt) => tt.classId === student.classId && tt.subjectId === id,
      );
      const teacher = timetableSlot
        ? Object.values(mockUsers).find((u) => u.id === timetableSlot.teacherId)
        : null;

      const textbooksWithLessons = textbooks.map((tb) => ({
        ...tb,
        chapters: tb.chapters.map((ch) => ({
          ...ch,
          lessons: mockLessons.filter((l) => l.chapterId === ch.id && l.textbookId === tb.id),
        })),
      }));

      return { subject, teacher,
        enrollment: enrollment ?? null,
        textbooks: textbooksWithLessons,
        assignments,
        quizzes,
      };
    },
  });

  const toggleTextbook = (id: string) => {
    setExpandedTextbook((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <SEOHead title={data?.subject?.name ?? 'Subject'} description={`${data?.subject?.name ?? 'Subject'} details and materials`} />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 max-w-4xl mx-auto space-y-4 pb-20"
      >
        <Button variant="ghost" size="sm" asChild className="mb-1">
          <Link to="/student/subjects" className="gap-2">
            <Icon name="arrow_back" size={16} />
            Back to Subjects
          </Link>
        </Button>

        {isLoading ? (
          <DetailSkeleton />
        ) : isError ? (
          <ErrorDisplay onRetry={() => refetch()} />
        ) : !data ? (
          <EmptyDisplay />
        ) : (
          <>
            {/* Subject Hero */}
            <motion.div variants={listItem} initial="hidden" animate="show">
              <Card className="overflow-hidden">
                <div
                  className="h-44 flex items-end p-6 relative"
                  style={{ backgroundColor: `${data.subject.color}20` }}
                >
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{ backgroundColor: data.subject.color }}
                  />
                  <div className="flex items-center gap-4 relative z-10">
                    <div
                      className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: data.subject.color }}
                    >
                      <Icon name={data.subject.icon} size={32} className="text-white" />
                    </div>
                    <div className="text-left">
                      <h1
                        className="text-2xl font-bold"
                        style={{ color: data.subject.color }}
                      >
                        {data.subject.name}
                      </h1>
                      <p className="text-sm text-muted-foreground">{data.subject.code}</p>
                      {data.teacher && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Icon name="person" size={14} />
                          {data.teacher.displayName}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {data.subject.category}
                        </Badge>
                        {data.enrollment && (
                          <Badge variant="info" className="text-[10px]">
                            {data.enrollment.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {data.enrollment && (
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Progress value={data.enrollment.progress} className="flex-1 h-2" />
                      <span className="text-sm font-medium tabular-nums">
                        {data.enrollment.progress}% complete
                      </span>
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              variants={listContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              <motion.div variants={listItem}>
                <Card>
                  <CardContent className="p-3 text-center">
                    <Icon name="menu_book" size={20} className="mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">{data.textbooks.length}</p>
                    <p className="text-xs text-muted-foreground">Textbooks</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={listItem}>
                <Card>
                  <CardContent className="p-3 text-center">
                    <Icon name="smart_display" size={20} className="mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">
                      {data.textbooks.reduce((sum, tb) => sum + tb.chapters.reduce((s, ch) => s + ch.lessons.length, 0), 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Lessons</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={listItem}>
                <Card>
                  <CardContent className="p-3 text-center">
                    <Icon name="assignment" size={20} className="mx-auto mb-1 text-amber-600" />
                    <p className="text-lg font-bold">{data.assignments.length}</p>
                    <p className="text-xs text-muted-foreground">Assignments</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div variants={listItem}>
                <Card>
                  <CardContent className="p-3 text-center">
                    <Icon name="quiz" size={20} className="mx-auto mb-1 text-emerald-600" />
                    <p className="text-lg font-bold">{data.quizzes.length}</p>
                    <p className="text-xs text-muted-foreground">Quizzes</p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>

            {/* Textbooks & Chapters */}
            <motion.div variants={listItem} initial="hidden" animate="show">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Icon name="menu_book" size={20} />
                Textbooks &amp; Materials
              </h2>

              {data.textbooks.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-3 py-10">
                    <Icon name="auto_stories" size={40} className="text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No textbooks available yet for this subject.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {data.textbooks.map((textbook) => (
                    <motion.div key={textbook.id} variants={listItem} initial="hidden" animate="show">
                      <Card className="overflow-hidden">
                        <button
                          onClick={() => toggleTextbook(textbook.id)}
                          className="w-full text-left"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Icon name="auto_stories" size={20} className="text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{textbook.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {textbook.chapters.length} chapters &middot; {textbook.chapters.reduce((s, ch) => s + ch.lessonCount, 0)} lessons
                                  </p>
                                </div>
                              </div>
                              <Icon
                                name={expandedTextbook === textbook.id ? 'expand_less' : 'expand_more'}
                                size={20}
                                className="text-muted-foreground flex-shrink-0 ml-2"
                              />
                            </div>
                            {textbook.description && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                {textbook.description}
                              </p>
                            )}
                          </CardContent>
                        </button>

                        {expandedTextbook === textbook.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t"
                          >
                            <div className="p-4 space-y-3">
                              {textbook.chapters.map((chapter) => (
                                <div key={chapter.id}>
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium">
                                      Chapter {chapter.order}: {chapter.title}
                                    </p>
                                    <Badge variant="secondary" className="text-[10px]">
                                      {chapter.lessonCount} lessons
                                    </Badge>
                                  </div>

                                  {/* Lessons */}
                                  {chapter.lessons.length > 0 ? (
                                    <div className="space-y-1.5 ml-2">
                                      {chapter.lessons.map((lesson) => (
                                        <Link
                                          key={lesson.id}
                                          to={`/student/courses/${data.subject.id}/lessons/${lesson.id}`}
                                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-sm group"
                                        >
                                          <Icon
                                            name={lesson.contentType === 'video' ? 'smart_display' : 'article'}
                                            size={16}
                                            className="text-muted-foreground flex-shrink-0"
                                          />
                                          <span className="flex-1 truncate">{lesson.title}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {lesson.duration}min
                                          </span>
                                          <Button
                                            size="icon-sm"
                                            variant="ghost"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <Icon name="play_arrow" size={16} />
                                          </Button>
                                        </Link>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground ml-2 italic">
                                      No lessons published yet
                                    </p>
                                  )}

                                  {/* Chapter Actions */}
                                  <div className="flex items-center gap-2 mt-2 ml-2">
                                    {chapter.lessons.length > 0 && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs gap-1.5 h-8"
                                        asChild
                                      >
                                        <Link
                                          to={`/student/courses/${data.subject.id}/lessons/${chapter.lessons[0].id}`}
                                        >
                                          <Icon name="smart_display" size={14} />
                                          Watch
                                        </Link>
                                      </Button>
                                    )}
                                    {data.quizzes
                                      .filter((q) => q.chapterId === chapter.id)
                                      .map((quiz) => (
                                        <Button
                                          key={quiz.id}
                                          size="sm"
                                          variant="outline"
                                          className="text-xs gap-1.5 h-8"
                                          asChild
                                        >
                                          <Link to={`/quizzes/${quiz.id}/attempt`}>
                                            <Icon name="quiz" size={14} />
                                            Quiz
                                          </Link>
                                        </Button>
                                      ))}
                                    {data.assignments
                                      .filter((a) => a.chapterId === chapter.id)
                                      .map((assignment) => (
                                        <Button
                                          key={assignment.id}
                                          size="sm"
                                          variant="outline"
                                          className="text-xs gap-1.5 h-8"
                                          asChild
                                        >
                                          <Link to={`/assignments/${assignment.id}`}>
                                            <Icon name="assignment" size={14} />
                                            Assignment
                                          </Link>
                                        </Button>
                                      ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </motion.div>
    </>
  );
}
