import { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { formatDate } from '@/lib/format';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { StudentCorrectionPanel } from './StudentCorrectionPanel';
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

interface CorrectionData {
  exam: typeof mockExams[0];
  subject: (typeof mockSubjects)[0] | null;
  studentSubmissionStatus: {
    student: typeof mockUsers.student1;
    submitted: boolean;
    correction: (typeof mockCorrections)[0] | null;
    totalMarks: number | null;
    maxMarks: number;
  }[];
  totalMaxMarks: number;
}

export default function TeacherExamCorrectionPage() {
  const { id } = useParams<{ id: string }>();
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<string, MarkEntry[]>>({});
  const [overallFeedback, setOverallFeedback] = useState<Record<string, string>>({});

  const { isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-exam-correction', id],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 500));
      return null;
    },
  });

  const exam = useMemo(() => mockExams.find((e) => e.id === id) ?? null, [id]);
  const subject = useMemo(() => mockSubjects.find((s) => s.id === exam?.subjectId) ?? null, [exam]);
  const corrections = useMemo(() => (exam ? mockCorrections.filter((c) => c.examId === exam.id) : []), [exam]);

  const correctionData = useMemo((): CorrectionData | null => {
    if (!exam) return null;

    const studentIds = mockEnrollments
      .filter((e) => e.subjectId === exam.subjectId && e.status === 'active')
      .map((e) => e.studentId);

    const enrolledStudents = studentIds
      .map((sid) => {
        const user = Object.values(mockUsers).find((u) => u.id === sid && u.role === 'student');
        return user ? ({ ...user } as typeof mockUsers.student1) : null;
      })
      .filter(Boolean) as typeof mockUsers.student1[];

    const totalMaxMarks = exam.questions.reduce((s, q) => s + q.points, 0);

    const studentSubmissionStatus = enrolledStudents.map((student) => {
      const correction = corrections.find((c) => c.studentId === student.id);
      return {
        student,
        submitted: !!correction,
        correction: correction ?? null,
        totalMarks: correction?.totalMarks ?? null,
        maxMarks: totalMaxMarks,
      };
    });

    return { exam, subject, studentSubmissionStatus, totalMaxMarks };
  }, [exam, corrections]);

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
      const existing = corrections.find((c) => c.studentId === studentId)?.overallFeedback;
      setOverallFeedback((prev) => ({ ...prev, [studentId]: existing ?? '' }));
    }
  }

  function handleMarksChange(studentId: string, questionIndex: number, field: 'marks' | 'feedback', value: string) {
    setMarks((prev) => {
      const studentMarks = [...(prev[studentId] || [])];
      if (!studentMarks[questionIndex]) {
        studentMarks[questionIndex] = { questionId: exam?.questions[questionIndex]?.id ?? '', marks: 0, feedback: '' };
      }
      studentMarks[questionIndex] = {
        ...studentMarks[questionIndex],
        [field]: field === 'marks' ? Number(value) || 0 : value,
      };
      return { ...prev, [studentId]: studentMarks };
    });
  }

  function handleOverallFeedbackChange(studentId: string, value: string) {
    setOverallFeedback((prev) => ({ ...prev, [studentId]: value }));
  }

  function handlePublish(studentId: string) {
    const studentMarks = marks[studentId];
    if (!studentMarks || !exam) {
      toast.error('Please enter marks for all questions');
      return;
    }
    const total = studentMarks.reduce((s, m) => s + (m.marks || 0), 0);
    const student = Object.values(mockUsers).find((u) => u.id === studentId);
    toast.success(`Grades published for ${student?.displayName ?? 'student'} — ${total}/${correctionData?.totalMaxMarks ?? 0}`);
  }

  function handlePublishAll() {
    const unpublished = correctionData?.studentSubmissionStatus.filter(
      (s) => s.submitted || marks[s.student.id],
    );
    if (!unpublished || unpublished.length === 0) {
      toast.error('No submissions to publish');
      return;
    }
    toast.success(`Published grades for ${unpublished.length} student${unpublished.length > 1 ? 's' : ''}`);
  }

  const notFound = !isLoading && !error && !exam;

  return (
    <>
      <SEOHead
        title={exam ? `Correcting: ${exam.title}` : 'Exam Correction'}
        description={exam ? `Grade submissions for ${exam.title}` : 'Correct student submissions'}
      />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 max-w-5xl mx-auto space-y-6 pb-20"
      >
        {notFound ? (
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
        ) : (
          <DataFetchWrapper
            data={correctionData}
            isLoading={isLoading}
            error={error}
            onRetry={() => refetch()}
            loadingType="detail"
          >
            {(data) => (
              <>
                <motion.div variants={listItem}>
                  <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2">
                    <Link to="/teacher/exams">
                      <Icon name="arrow_back" size={16} />
                      Back to Exams
                    </Link>
                  </Button>
                </motion.div>

                <motion.div variants={listItem}>
                  <Card variant="elevated">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="h-14 w-14 rounded-xl bg-warning-container flex items-center justify-center flex-shrink-0">
                          <Icon name="fact_check" size={28} className="text-on-warning-container" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h1 className="text-headline-sm">{data.exam.title}</h1>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Icon name="menu_book" size={15} />
                              {data.subject?.name ?? 'Unknown Subject'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Icon name="quiz" size={15} />
                              {data.exam.questions.length} questions
                            </span>
                            <span className="flex items-center gap-1">
                              <Icon name="schedule" size={15} />
                              {data.exam.duration} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Icon name="calendar_today" size={15} />
                              {formatDate(data.exam.startDate)} - {formatDate(data.exam.endDate)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{data.exam.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="info" className="text-[10px]">
                              <Icon name="group" size={12} className="mr-1" />
                              {data.studentSubmissionStatus.length} students enrolled
                            </Badge>
                            <Badge variant="success" className="text-[10px]">
                              <Icon name="check_circle" size={12} className="mr-1" />
                              {data.studentSubmissionStatus.filter((s) => s.submitted).length} submitted
                            </Badge>
                            <Badge variant="warning" className="text-[10px]">
                              <Icon name="hourglass_empty" size={12} className="mr-1" />
                              {data.studentSubmissionStatus.filter((s) => !s.submitted).length} pending
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={listItem}>
                  <Card variant="elevated">
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
                      {data.studentSubmissionStatus.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-center">
                          <Icon name="group_off" size={36} className="text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No students enrolled in this subject</p>
                        </div>
                      ) : (
                        <motion.div variants={listContainer} initial="hidden" animate="show">
                          {data.studentSubmissionStatus.map((status) => (
                            <StudentCorrectionPanel
                              key={status.student.id}
                              student={status}
                              exam={data.exam}
                              expandedStudent={expandedStudent}
                              marks={marks}
                              overallFeedback={overallFeedback}
                              onToggleExpand={handleToggleExpand}
                              onMarksChange={handleMarksChange}
                              onOverallFeedbackChange={handleOverallFeedbackChange}
                              onPublish={handlePublish}
                            />
                          ))}
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </>
            )}
          </DataFetchWrapper>
        )}
      </motion.div>
    </>
  );
}
