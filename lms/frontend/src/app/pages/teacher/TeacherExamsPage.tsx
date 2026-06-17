import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/lib/format';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import {
  getAllSubjects,
  getUserByRole,
  getExamsBySubject,
  getCorrectionsByExam,
} from '@/services/dataService';
import { teacherClassSubjectService } from '@/services/teacherClassSubjectService';

const NOW = new Date();

interface ExamQuestion {
  id: string;
  type: string;
  question: string;
  points: number;
  options?: string[];
  correctAnswer?: string;
}

interface ExamData {
  id: string;
  title: string;
  description: string;
  questions: ExamQuestion[];
  duration: number;
  startDate: string;
  subjectName: string;
  submittedCount: number;
  pendingCount: number;
  status: 'graded' | 'pending' | 'upcoming';
}

function ExamCard({
  title,
  description,
  questions,
  duration,
  startDate,
  subjectName,
  submittedCount,
  pendingCount,
  status,
  id: examId,
}: ExamData) {
  return (
    <motion.div variants={cardStackReveal} custom={0}>
      <Card className="border-border/60 hover:shadow-md transition-all duration-200 group">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div
              className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                status === 'graded'
                  ? 'bg-success-container'
                  : status === 'pending'
                    ? 'bg-warning-container'
                    : 'bg-secondary-container'
              }`}
            >
              <Icon
                name="fact_check"
                size={24}
                className={
                  status === 'graded'
                    ? 'text-on-success-container'
                    : status === 'pending'
                      ? 'text-on-warning-container'
                      : 'text-on-secondary-container'
                }
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
                  className="text-label-xs flex-shrink-0 capitalize"
                >
                  {status}
                </Badge>
              </div>
              <p className="text-label-xs text-muted-foreground">{subjectName}</p>
              <p className="text-label-xs text-muted-foreground mt-0.5 line-clamp-1">
                {description}
              </p>
              <div className="flex items-center gap-4 mt-2 text-label-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Icon name="quiz" size={14} />
                  {questions.length} questions
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="schedule" size={14} />
                  {duration} min
                </span>
                <span className="flex items-center gap-1">
                  <Icon name="calendar_today" size={14} />
                  {formatDate(startDate)}
                </span>
              </div>
              {submittedCount > 0 && (
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="info" className="text-label-xs">
                    <Icon name="check_circle" size={11} className="mr-1" />
                    {submittedCount} submitted
                  </Badge>
                  {pendingCount > 0 && (
                    <Badge variant="warning" className="text-label-xs">
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

export default function TeacherExamsPage() {
  const { isLoading, error, refetch, data } = useQuery({
    queryKey: ['teacher-exams'],
    queryFn: async () => {
      const [allSubjects, students, assignmentsRes] = await Promise.all([
        getAllSubjects(),
        getUserByRole('student'),
        teacherClassSubjectService.getMyAssignments().catch(() => ({ data: [] })),
      ]);

      const myAssignments = assignmentsRes?.data ?? [];
      const mySubjectIds = [...new Set(myAssignments.map((a) => a.subjectId))];
      const teacherSubjects = allSubjects.filter((s) => mySubjectIds.includes(s.id));

      const examsArrays = await Promise.all(
        teacherSubjects.map((s) => getExamsBySubject(s.id)),
      );
      const allExams = examsArrays.flat();

      const correctionsArrays = await Promise.all(
        allExams.map((e) => getCorrectionsByExam(e.id)),
      );
      const allCorrections = correctionsArrays.flat();

      const now = new Date();

      const mapped: ExamData[] = allExams.map((exam) => {
        const subject = allSubjects.find((s) => s.id === exam.subjectId);
        const corrections = allCorrections.filter((c) => c.examId === exam.id);
        
        const targetClassId = (exam as any).classId;
        const studentIds = students
          .filter((s) => {
            if (s.role !== 'student' || !s.classId) return false;
            if (targetClassId) return s.classId === targetClassId;
            const matchedClasses = myAssignments
              .filter((a) => a.subjectId === exam.subjectId)
              .map((a) => a.classId);
            return matchedClasses.includes(s.classId);
          })
          .map((s) => s.id);

        const gradedCount = corrections.filter((c) => c.status === 'published').length;
        const submittedCount = corrections.length;
        const pendingCount = studentIds.length - submittedCount;

        const isFuture = exam.startDate ? new Date(exam.startDate) > now : false;
        const hasGraded = gradedCount > 0;
        const hasSubmissions = submittedCount > 0;

        let status: 'graded' | 'pending' | 'upcoming' = 'upcoming';
        if (isFuture) status = 'upcoming';
        else if (hasGraded) status = 'graded';
        else if (hasSubmissions || !isFuture) status = 'pending';

        return {
          id: exam.id,
          title: exam.title,
          description: exam.description ?? '',
          questions: (exam.questions ?? []) as ExamQuestion[],
          duration: exam.duration ?? 0,
          startDate: exam.startDate ?? '',
          subjectName: subject?.name ?? 'Unknown',
          submittedCount,
          pendingCount: Math.max(0, pendingCount),
          status,
        };
      });

      return { allExams: mapped, allSubjects };
    },
  });

  const examsData = data?.allExams ?? [];
  const subjects = data?.allSubjects ?? [];

  const toCorrect = useMemo(
    () => examsData.filter((e) => e.status === 'pending' && e.submittedCount > 0),
    [examsData],
  );

  return (
    <>
      <SEOHead title="Exams" description="Manage and correct exams" canonical="/teacher/exams" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <DataFetchWrapper
          data={examsData}
          isLoading={isLoading}
          error={error}
          onRetry={() => refetch()}
          loadingType="list"
          emptyMessage="No exams have been created yet"
          emptyAction={
            subjects.length > 0 ? undefined : (
              <Link to="/teacher/subjects" className="gap-1 inline-flex items-center">
                <Icon name="menu_book" size={16} />
                Manage Subjects
              </Link>
            )
          }
        >
          {() => (
            <>
              <motion.div variants={cardStackReveal} custom={0}>
                <h1 className="text-headline-sm">Exams</h1>
                <p className="text-body-md text-muted-foreground">
                  Correct submissions and manage exams
                </p>
              </motion.div>

              <motion.div variants={cardStackReveal} custom={0}>
                <Tabs defaultValue="to-correct" className="w-full">
                  <TabsList className="w-full overflow-x-auto inline-flex">
                    <TabsTrigger value="to-correct" className="gap-2">
                      <Icon name="rate_review" size={16} />
                      To Correct
                      {toCorrect.length > 0 && (
                        <Badge variant="warning" className="ml-1 text-label-xs px-1.5">
                          {toCorrect.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="all" className="gap-2">
                      <Icon name="fact_check" size={16} />
                      All Exams
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="to-correct" className="mt-4">
                    {toCorrect.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 py-10 text-center">
                        <Icon name="fact_check" size={40} className="text-muted-foreground/50" />
                        <p className="text-body-md text-muted-foreground">No exams needing correction. Great job!</p>
                      </div>
                    ) : (
                      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
                        {toCorrect.map((exam) => (
                          <ExamCard key={exam.id} {...exam} />
                        ))}
                      </motion.div>
                    )}
                  </TabsContent>

                  <TabsContent value="all" className="mt-4">
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
                      {examsData.map((exam) => (
                        <ExamCard key={exam.id} {...exam} />
                      ))}
                    </motion.div>
                  </TabsContent>
                </Tabs>
              </motion.div>
            </>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
