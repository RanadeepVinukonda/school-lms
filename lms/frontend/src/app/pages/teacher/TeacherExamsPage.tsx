import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import {
  mockExams,
  mockSubjects,
  mockCorrections,
  mockEnrollments,
} from '@/lib/mockData';

const NOW = new Date();

function ExamCard({
  title,
  description,
  questions,
  timeLimit,
  startDate,
  subjectName,
  submittedCount,
  pendingCount,
  status,
  id: examId,
}: {
  id: string;
  title: string;
  description: string;
  questions: (typeof mockExams)[0]['questions'];
  timeLimit: number;
  startDate: string;
  subjectName: string;
  submittedCount: number;
  pendingCount: number;
  status: 'graded' | 'pending' | 'upcoming';
}) {
  return (
    <motion.div variants={listItem}>
      <Card className="hover:shadow-md transition-all duration-200 group">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0',
                status === 'graded' && 'bg-emerald-500/10',
                status === 'pending' && 'bg-amber-500/10',
                status === 'upcoming' && 'bg-violet-500/10',
              )}
            >
              <Icon
                name="fact_check"
                size={24}
                className={cn(
                  status === 'graded' && 'text-emerald-600',
                  status === 'pending' && 'text-amber-600',
                  status === 'upcoming' && 'text-violet-600',
                )}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-semibold truncate">{title}</p>
                <Badge
                  variant={
                    status === 'graded'
                      ? 'success'
                      : status === 'pending'
                        ? 'warning'
                        : 'info'
                  }
                  className="text-[10px] flex-shrink-0 capitalize"
                >
                  {status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{subjectName}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {description}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Icon name="quiz" size={14} />
                  {questions.length} questions
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="schedule" size={14} />
                  {timeLimit} min
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="calendar_today" size={14} />
                  {formatDate(startDate)}
                </span>
              </div>
              {submittedCount > 0 && (
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="info" className="text-[10px]">
                    <Icon name="check_circle" size={11} className="mr-1" />
                    {submittedCount} submitted
                  </Badge>
                  {pendingCount > 0 && (
                    <Badge variant="warning" className="text-[10px]">
                      <Icon name="hourglass_empty" size={11} className="mr-1" />
                      {pendingCount} pending
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              {(status === 'pending' || submittedCount > 0) && (
                <Button size="sm" asChild>
                  <Link to={`/teacher/exams/${examId}/correct`} className="gap-1">
                    <Icon name="rate_review" size={15} />
                    Correct
                  </Link>
                </Button>
              )}
              {status === 'upcoming' && (
                <Button size="sm" variant="outline" disabled className="gap-1">
                  <Icon name="schedule" size={15} />
                  Pending
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ExamsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

function ErrorDisplay({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <Icon name="error" size={28} className="text-destructive" />
        </div>
        <p className="text-lg font-semibold">Failed to load exams</p>
        <p className="text-sm text-muted-foreground">Please check your connection and try again</p>
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <Icon name="refresh" size={16} />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyDisplay({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10">
        <Icon name="fact_check" size={40} className="text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

export default function TeacherExamsPage() {
  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher-exams'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 500));
      return null;
    },
  });

  const examsData = useMemo(() => {
    return mockExams.map((exam) => {
      const subject = mockSubjects.find((s) => s.id === exam.subjectId);
      const corrections = mockCorrections.filter((c) => c.examId === exam.id);
      const studentIds = mockEnrollments
        .filter((e) => e.subjectId === exam.subjectId && e.status === 'active')
        .map((e) => e.studentId);
      const gradedCount = corrections.filter((c) => c.status === 'published').length;
      const submittedCount = corrections.length;
      const pendingCount = studentIds.length - submittedCount;

      const isFuture = new Date(exam.startDate) > NOW;
      const hasGraded = gradedCount > 0;
      const hasSubmissions = submittedCount > 0;

      let status: 'graded' | 'pending' | 'upcoming' = 'upcoming';
      if (isFuture) status = 'upcoming';
      else if (hasGraded) status = 'graded';
      else if (hasSubmissions || !isFuture) status = 'pending';

      return {
        ...exam,
        subjectName: subject?.name ?? 'Unknown',
        subjectColor: subject?.color ?? '#6366f1',
        submittedCount,
        pendingCount,
        gradedCount,
        status,
      };
    });
  }, []);

  const toCorrect = useMemo(
    () =>
      examsData.filter(
        (e) => e.status === 'pending' && e.submittedCount > 0,
      ),
    [examsData],
  );

  if (isLoading) {
    return (
      <div className="p-4 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-64 rounded-md" />
        <ExamsSkeleton />
      </div>
    );
  }

  if (isError) return <ErrorDisplay onRetry={() => refetch()} />;

  return (
    <>
      <SEOHead
        title="Exams"
        description="Manage and correct exams"
        canonical="/teacher/exams"
      />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 max-w-5xl mx-auto space-y-6 pb-20"
      >
        {/* Header */}
        <motion.div variants={listItem}>
          <h1 className="text-2xl font-bold">Exams</h1>
          <p className="text-sm text-muted-foreground">
            Correct submissions and manage exams
          </p>
        </motion.div>

        <Tabs defaultValue="to-correct" className="w-full">
          <motion.div variants={listItem}>
            <TabsList>
              <TabsTrigger value="to-correct" className="gap-2">
                <Icon name="rate_review" size={16} />
                To Correct
                {toCorrect.length > 0 && (
                  <Badge variant="warning" className="ml-1 text-[10px] px-1.5">
                    {toCorrect.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2">
                <Icon name="fact_check" size={16} />
                All Exams
              </TabsTrigger>
            </TabsList>
          </motion.div>

          <TabsContent value="to-correct" className="mt-4">
            {toCorrect.length === 0 ? (
              <EmptyDisplay message="No exams needing correction. Great job!" />
            ) : (
              <motion.div
                variants={listContainer}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                {toCorrect.map((exam) => (
                  <ExamCard key={exam.id} {...exam} />
                ))}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            {examsData.length === 0 ? (
              <EmptyDisplay message="No exams have been created yet" />
            ) : (
              <motion.div
                variants={listContainer}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                {examsData.map((exam) => (
                  <ExamCard key={exam.id} {...exam} />
                ))}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </>
  );
}
