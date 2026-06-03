import { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Icon } from '@/components/ui/Icon';
import { cn, getInitials } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { pageTransition, listContainer, listItem, springTransition } from '@/lib/motion';
import {
  mockUsers,
  mockExams,
  mockSubjects,
  mockEnrollments,
  mockCorrections,
} from '@/lib/mockData';

interface MarkEntry {
  questionId: string;
  marks: number;
  feedback: string;
}

function CorrectionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
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
        <p className="text-lg font-semibold">Failed to load exam data</p>
        <p className="text-sm text-muted-foreground">
          Please check your connection and try again
        </p>
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <Icon name="refresh" size={16} />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

export default function TeacherExamCorrectionPage() {
  const { id } = useParams<{ id: string }>();
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<string, MarkEntry[]>>({});
  const [overallFeedback, setOverallFeedback] = useState<Record<string, string>>({});

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher-exam-correction', id],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 500));
      if (!id) return null;
      return null;
    },
  });

  const exam = useMemo(
    () => mockExams.find((e) => e.id === id) ?? null,
    [id],
  );

  const subject = useMemo(
    () => mockSubjects.find((s) => s.id === exam?.courseId) ?? null,
    [exam],
  );

  const enrolledStudents = useMemo(() => {
    if (!exam) return [];
    const studentIds = mockEnrollments
      .filter(
        (e) => e.subjectId === exam.courseId && e.status === 'active',
      )
      .map((e) => e.studentId);
    return studentIds
      .map((sid) => {
        const user = Object.values(mockUsers).find(
          (u) => u.id === sid && u.role === 'student',
        );
        return user ? { ...user } : null;
      })
      .filter(Boolean) as (typeof mockUsers.student1)[];
  }, [exam]);

  const corrections = useMemo(() => {
    if (!exam) return [];
    return mockCorrections.filter((c) => c.examId === exam.id);
  }, [exam]);

  const studentSubmissionStatus = useMemo(() => {
    return enrolledStudents.map((student) => {
      const correction = corrections.find(
        (c) => c.studentId === student.id,
      );
      return {
        student,
        submitted: !!correction,
        correction: correction ?? null,
        totalMarks: correction?.totalMarks ?? null,
        maxMarks: exam
          ? exam.questions.reduce((s, q) => s + q.points, 0)
          : 0,
      };
    });
  }, [enrolledStudents, corrections, exam]);

  const totalMaxMarks = useMemo(
    () => (exam ? exam.questions.reduce((s, q) => s + q.points, 0) : 0),
    [exam],
  );

  function handleToggleExpand(studentId: string) {
    if (expandedStudent === studentId) {
      setExpandedStudent(null);
      return;
    }
    setExpandedStudent(studentId);

    if (!marks[studentId] && exam) {
      const initialMarks = exam.questions.map((q) => {
        const existing = corrections
          .find((c) => c.studentId === studentId)
          ?.questionMarks.find((qm) => qm.questionId === q.id);
        return {
          questionId: q.id,
          marks: existing?.marks ?? 0,
          feedback: existing?.feedback ?? '',
        };
      });
      setMarks((prev) => ({ ...prev, [studentId]: initialMarks }));
    }

    if (!overallFeedback[studentId]) {
      const existing = corrections.find(
        (c) => c.studentId === studentId,
      )?.overallFeedback;
      setOverallFeedback((prev) => ({
        ...prev,
        [studentId]: existing ?? '',
      }));
    }
  }

  function handleMarksChange(
    studentId: string,
    questionIndex: number,
    field: 'marks' | 'feedback',
    value: string,
  ) {
    setMarks((prev) => {
      const studentMarks = [...(prev[studentId] || [])];
      if (!studentMarks[questionIndex]) {
        studentMarks[questionIndex] = {
          questionId: exam?.questions[questionIndex]?.id ?? '',
          marks: 0,
          feedback: '',
        };
      }
      studentMarks[questionIndex] = {
        ...studentMarks[questionIndex],
        [field]: field === 'marks' ? Number(value) || 0 : value,
      };
      return { ...prev, [studentId]: studentMarks };
    });
  }

  function handlePublish(studentId: string) {
    const studentMarks = marks[studentId];
    if (!studentMarks || !exam) {
      toast.error('Please enter marks for all questions');
      return;
    }

    const total = studentMarks.reduce((s, m) => s + (m.marks || 0), 0);
    const student = Object.values(mockUsers).find(
      (u) => u.id === studentId,
    );
    toast.success(
      `Grades published for ${student?.displayName ?? 'student'} — ${total}/${totalMaxMarks}`,
    );
  }

  function handlePublishAll() {
    const unpublished = studentSubmissionStatus.filter(
      (s) => s.submitted || marks[s.student.id],
    );
    if (unpublished.length === 0) {
      toast.error('No submissions to publish');
      return;
    }
    toast.success(
      `Published grades for ${unpublished.length} student${unpublished.length > 1 ? 's' : ''}`,
    );
  }

  if (isLoading) return <CorrectionSkeleton />;

  if (isError) return <ErrorDisplay onRetry={() => refetch()} />;

  if (!exam) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Icon name="fact_check" size={48} className="text-muted-foreground/40" />
            <p className="text-lg font-medium">Exam not found</p>
            <p className="text-sm text-muted-foreground">
              The exam you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button asChild>
              <Link to="/teacher/exams">
                <Icon name="arrow_back" size={16} className="mr-1" />
                Back to Exams
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={`Correcting: ${exam.title}`}
        description={`Grade submissions for ${exam.title}`}
      />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 max-w-5xl mx-auto space-y-6 pb-20"
      >
        {/* Back button */}
        <motion.div variants={listItem}>
          <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2">
            <Link to="/teacher/exams">
              <Icon name="arrow_back" size={16} />
              Back to Exams
            </Link>
          </Button>
        </motion.div>

        {/* Exam Info Header */}
        <motion.div variants={listItem}>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="fact_check" size={28} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold">{exam.title}</h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Icon name="menu_book" size={15} />
                      {subject?.name ?? 'Unknown Subject'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="quiz" size={15} />
                      {exam.questions.length} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="schedule" size={15} />
                      {exam.timeLimit} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="calendar_today" size={15} />
                      {formatDate(exam.startDate)} - {formatDate(exam.endDate)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {exam.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant="info" className="text-[10px]">
                      <Icon name="group" size={12} className="mr-1" />
                      {enrolledStudents.length} students enrolled
                    </Badge>
                    <Badge variant="success" className="text-[10px]">
                      <Icon name="check_circle" size={12} className="mr-1" />
                      {corrections.length} submitted
                    </Badge>
                    <Badge variant="warning" className="text-[10px]">
                      <Icon name="hourglass_empty" size={12} className="mr-1" />
                      {enrolledStudents.length - corrections.length} pending
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Student List */}
        <motion.div variants={listItem}>
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon name="group" size={18} className="text-muted-foreground" />
                Students
              </CardTitle>
              <Button size="sm" onClick={handlePublishAll} className="gap-1">
                <Icon name="send" size={15} />
                Publish All Grades
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {studentSubmissionStatus.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Icon name="group_off" size={36} className="text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No students enrolled in this subject
                  </p>
                </div>
              ) : (
                <motion.div
                  variants={listContainer}
                  initial="hidden"
                  animate="show"
                >
                  {studentSubmissionStatus.map(({ student, submitted, correction }) => (
                    <motion.div key={student.id} variants={listItem}>
                      <div className="border-b last:border-b-0">
                        <button
                          type="button"
                          onClick={() => handleToggleExpand(student.id)}
                          className="w-full flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors text-left"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="text-xs">
                              {getInitials(student.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {student.displayName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(student as typeof mockUsers.student1).studentId ?? student.id}
                            </p>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            {submitted && correction ? (
                              <>
                                <Badge variant="success" className="text-[10px]">
                                  Submitted
                                </Badge>
                                <span className="text-sm font-semibold tabular-nums">
                                  {correction.totalMarks}/{totalMaxMarks}
                                </span>
                              </>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                Pending
                              </Badge>
                            )}
                            <Icon
                              name={
                                expandedStudent === student.id
                                  ? 'expand_less'
                                  : 'expand_more'
                              }
                              size={20}
                              className="text-muted-foreground/50"
                            />
                          </div>
                        </button>

                        {/* Expanded Correction Panel */}
                        {expandedStudent === student.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-t bg-muted/20"
                          >
                            <div className="p-4 space-y-4">
                              {exam.questions.map((question, qi) => (
                                <div key={question.id} className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className="text-[10px]"
                                        >
                                          Q{qi + 1}
                                        </Badge>
                                        <Badge
                                          variant="secondary"
                                          className="text-[10px]"
                                        >
                                          {question.type === 'multiple_choice'
                                            ? 'MCQ'
                                            : 'Essay'}{' '}
                                          &middot; {question.points} pts
                                        </Badge>
                                      </div>
                                      <p className="text-sm mt-1">
                                        {question.question}
                                      </p>
                                      {question.type ===
                                        'multiple_choice' && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          Options:{' '}
                                          {question.options?.join(', ') ??
                                            'N/A'}
                                        </p>
                                      )}
                                      <p className="text-xs text-emerald-600 mt-0.5">
                                        Correct answer:{' '}
                                        {question.correctAnswer}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Student Answer placeholder */}
                                  <div className="rounded-md border bg-card p-3">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      Student Answer:
                                    </p>
                                    <p className="text-sm italic">
                                      {correction
                                        ? correction.questionMarks.find(
                                            (qm) =>
                                              qm.questionId === question.id,
                                          )?.feedback ?? 'Answer provided'
                                        : 'No submission yet'}
                                    </p>
                                  </div>

                                  {/* Marks Input */}
                                  <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="w-full sm:w-32">
                                      <label className="text-xs text-muted-foreground mb-1 block">
                                        Marks awarded (max {question.points})
                                      </label>
                                      <Input
                                        type="number"
                                        min={0}
                                        max={question.points}
                                        value={
                                          marks[student.id]?.[qi]?.marks ??
                                          ''
                                        }
                                        onChange={(e) =>
                                          handleMarksChange(
                                            student.id,
                                            qi,
                                            'marks',
                                            e.target.value,
                                          )
                                        }
                                        disabled={!submitted}
                                        placeholder="0"
                                        className="h-9"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="text-xs text-muted-foreground mb-1 block">
                                        Feedback
                                      </label>
                                      <Textarea
                                        value={
                                          marks[student.id]?.[qi]
                                            ?.feedback ?? ''
                                        }
                                        onChange={(e) =>
                                          handleMarksChange(
                                            student.id,
                                            qi,
                                            'feedback',
                                            e.target.value,
                                          )
                                        }
                                        disabled={!submitted}
                                        placeholder="Add feedback for this question..."
                                        className="min-h-[60px]"
                                      />
                                    </div>
                                  </div>
                                  {qi < exam.questions.length - 1 && (
                                    <Separator />
                                  )}
                                </div>
                              ))}

                              {/* Overall Feedback */}
                              <div className="pt-2">
                                <label className="text-sm font-medium mb-1 block">
                                  Overall Feedback
                                </label>
                                <Textarea
                                  value={
                                    overallFeedback[student.id] ?? ''
                                  }
                                  onChange={(e) =>
                                    setOverallFeedback((prev) => ({
                                      ...prev,
                                      [student.id]: e.target.value,
                                    }))
                                  }
                                  disabled={!submitted}
                                  placeholder="Write overall feedback for this student..."
                                  className="min-h-[80px]"
                                />
                              </div>

                              {/* Publish Button */}
                              <div className="flex justify-end pt-2">
                                <Button
                                  onClick={() => handlePublish(student.id)}
                                  disabled={!submitted}
                                  className="gap-1"
                                >
                                  <Icon name="send" size={16} />
                                  Publish Grades
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
}
