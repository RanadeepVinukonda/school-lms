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
import { mockUsers, mockEnrollments, mockSubjects, mockTextbooks, mockLessons, mockAssignments, mockQuizzes, mockTimetable } from '@/lib/mockData';
import { ROUTES } from '@/lib/constants';

export default function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, error, refetch } = useQuery({
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

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Failed to load subject') : null}
          loadingType="detail"
          emptyMessage="Subject not found"
          emptyIcon={<Icon name="menu_book" size={32} />}
          emptyAction={
            <Button asChild>
              <Link to={ROUTES.STUDENT_SUBJECTS}>
                <Icon name="arrow_back" size={16} className="mr-2" />
                Back to Subjects
              </Link>
            </Button>
          }
          onRetry={() => refetch()}
          errorTitle="Failed to load subject"
        >
          {(d) => (
            <>
              <motion.div variants={listItem} initial="hidden" animate="show">
                <Card className="overflow-hidden">
                  <div className="h-44 flex items-end p-6 relative" style={{ backgroundColor: `${d.subject.color}20` }}>
                    <div className="absolute inset-0 opacity-10" style={{ backgroundColor: d.subject.color }} />
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: d.subject.color }}>
                        <Icon name={d.subject.icon} size={32} className="text-white" />
                      </div>
                      <div className="text-left">
                        <h1 className="text-2xl font-bold" style={{ color: d.subject.color }}>{d.subject.name}</h1>
                        <p className="text-body-md text-muted-foreground">{d.subject.code}</p>
                        {d.teacher && (
                          <p className="text-body-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <Icon name="person" size={14} />
                            {d.teacher.displayName}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-[10px]">{d.subject.category}</Badge>
                          {d.enrollment && <Badge variant="info" className="text-[10px]">{d.enrollment.status}</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                  {d.enrollment && (
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Progress value={d.enrollment.progress} className="flex-1 h-2" />
                        <span className="text-sm font-medium tabular-nums">{d.enrollment.progress}% complete</span>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>

              <motion.div variants={listItem} initial="hidden" animate="show">
                <h2 className="text-title-sm font-semibold mb-3 flex items-center gap-2">
                  <Icon name="menu_book" size={20} />
                  Textbooks
                </h2>
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
                              {tb.description && (
                                <p className="text-body-sm text-muted-foreground line-clamp-2">{tb.description}</p>
                              )}
                              <div className="flex items-center gap-3 text-body-sm text-muted-foreground">
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
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
