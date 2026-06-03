import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@/components/ui/Icon';
import { pageTransition, listItem } from '@/lib/motion';
import { useQuery } from '@tanstack/react-query';
import { mockUsers, mockEnrollments, mockSubjects, mockTextbooks, mockLessons, mockAssignments, mockQuizzes, mockTimetable } from '@/lib/mockData';
import { ROUTES } from '@/lib/constants';

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-44 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[1, 2].map((i) => (<Skeleton key={i} className="h-32 rounded-xl" />))}
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

export default function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['subject-detail', id],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      if (!id) return null;
      const subject = mockSubjects.find((s) => s.id === id);
      if (!subject) return null;
      const student = mockUsers.student1;
      const enrollment = mockEnrollments.find((e) => e.studentId === student.id && e.subjectId === id);
      const textbooks = mockTextbooks.filter((tb) => tb.subjectId === id).map((tb) => {
        const lessons = mockLessons.filter((l) => l.textbookId === tb.id);
        return { ...tb, lessonCount: lessons.length, assignmentCount: mockAssignments.filter((a) => a.textbookId === tb.id).length, quizCount: mockQuizzes.filter((q) => q.textbookId === tb.id).length };
      });
      const timetableSlot = mockTimetable.find((tt) => tt.classId === student.classId && tt.subjectId === id);
      const teacher = timetableSlot ? Object.values(mockUsers).find((u) => u.id === timetableSlot.teacherId) : null;
      return { subject, teacher, enrollment: enrollment ?? null, textbooks };
    },
  });

  return (
    <>
      <SEOHead title={data?.subject?.name ?? 'Subject'} description={`${data?.subject?.name ?? 'Subject'} details and materials`} />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-4xl mx-auto space-y-4 pb-20">
        <Button variant="ghost" size="sm" asChild className="mb-1">
          <Link to={ROUTES.STUDENT_SUBJECTS} className="gap-2">
            <Icon name="arrow_back" size={16} />
            Back to Subjects
          </Link>
        </Button>

        {isLoading ? (
          <DetailSkeleton />
        ) : isError ? (
          <ErrorDisplay onRetry={() => refetch()} />
        ) : !data ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Icon name="menu_book" size={32} className="text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold">Subject not found</p>
              <Button asChild>
                <Link to={ROUTES.STUDENT_SUBJECTS}>
                  <Icon name="arrow_back" size={16} className="mr-2" />
                  Back to Subjects
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Subject Hero */}
            <motion.div variants={listItem} initial="hidden" animate="show">
              <Card className="overflow-hidden">
                <div className="h-44 flex items-end p-6 relative" style={{ backgroundColor: `${data.subject.color}20` }}>
                  <div className="absolute inset-0 opacity-10" style={{ backgroundColor: data.subject.color }} />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: data.subject.color }}>
                      <Icon name={data.subject.icon} size={32} className="text-white" />
                    </div>
                    <div className="text-left">
                      <h1 className="text-2xl font-bold" style={{ color: data.subject.color }}>{data.subject.name}</h1>
                      <p className="text-sm text-muted-foreground">{data.subject.code}</p>
                      {data.teacher && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Icon name="person" size={14} />
                          {data.teacher.displayName}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px]">{data.subject.category}</Badge>
                        {data.enrollment && <Badge variant="info" className="text-[10px]">{data.enrollment.status}</Badge>}
                      </div>
                    </div>
                  </div>
                </div>
                {data.enrollment && (
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Progress value={data.enrollment.progress} className="flex-1 h-2" />
                      <span className="text-sm font-medium tabular-nums">{data.enrollment.progress}% complete</span>
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>

            {/* Textbooks Grid */}
            <motion.div variants={listItem} initial="hidden" animate="show">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Icon name="menu_book" size={20} />
                Textbooks
              </h2>
              {data.textbooks.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-3 py-10">
                    <Icon name="auto_stories" size={40} className="text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No textbooks available yet for this subject.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.textbooks.map((tb, idx) => (
                    <motion.div key={tb.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}>
                      <Link to={ROUTES.STUDENT_TEXTBOOK(tb.id)} className="block h-full">
                        <Card className="h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden">
                          <div className="h-2" style={{ backgroundColor: data.subject.color }} />
                          <CardContent className="p-5 flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: `${data.subject.color}18` }}>
                                <Icon name="auto_stories" size={24} style={{ color: data.subject.color }} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold truncate">{tb.title}</p>
                                <p className="text-xs text-muted-foreground">{data.subject.code}</p>
                              </div>
                            </div>
                            {tb.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{tb.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Icon name="smart_display" size={14} />{tb.lessonCount} lessons</span>
                              <span className="flex items-center gap-1"><Icon name="quiz" size={14} />{tb.quizCount} quizzes</span>
                              <span className="flex items-center gap-1"><Icon name="assignment" size={14} />{tb.assignmentCount} assignments</span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
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