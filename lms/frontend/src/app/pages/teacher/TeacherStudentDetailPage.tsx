import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/Icon';
import { getInitials } from '@/lib/utils';
import { formatDate, getLetterGrade } from '@/lib/format';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import {
  mockUsers,
  mockClasses,
  mockSubjects,
  mockEnrollments,
  mockGrades,
} from '@/lib/mockData';

interface StudentDetailData {
  student: typeof mockUsers.student1;
  studentClass: (typeof mockClasses)[0] | null;
  subjectPerformance: ((typeof mockSubjects)[0] & { percentage: number })[];
  grades: (typeof mockGrades[0] & { subject: (typeof mockSubjects)[0] | undefined })[];
  performanceTrend: (typeof mockGrades[0] & { subject: (typeof mockSubjects)[0] | undefined })[];
}

export default function TeacherStudentDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-student-detail', id],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      return null;
    },
  });

  const student = useMemo(() => {
    if (!id) return null;
    const found = Object.values(mockUsers).find((u) => u.id === id && u.role === 'student');
    return found ? (found as typeof mockUsers.student1) : null;
  }, [id]);

  const detailData = useMemo((): StudentDetailData | null => {
    if (!student) return null;

    const studentClass = mockClasses.find((c) => c.id === student.classId) ?? null;

    const grades = mockGrades
      .filter((g) => g.studentId === student.id)
      .map((g) => ({
        ...g,
        subject: mockSubjects.find((s) => s.id === g.subjectId),
      }))
      .sort((a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime());

    const bySubject = new Map<string, { scores: number[]; maxScores: number[] }>();
    mockGrades
      .filter((g) => g.studentId === student.id)
      .forEach((g) => {
        const existing = bySubject.get(g.subjectId) ?? { scores: [], maxScores: [] };
        existing.scores.push(g.score);
        existing.maxScores.push(g.maxScore);
        bySubject.set(g.subjectId, existing);
      });
    const subjectPerformance = mockSubjects
      .map((sub) => {
        const data = bySubject.get(sub.id);
        if (!data) return null;
        const totalScore = data.scores.reduce((a, b) => a + b, 0);
        const totalMax = data.maxScores.reduce((a, b) => a + b, 0);
        const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
        return { ...sub, percentage };
      })
      .filter(Boolean) as (typeof mockSubjects[0] & { percentage: number })[];

    const performanceTrend = [...grades]
      .sort((a, b) => new Date(a.gradedAt).getTime() - new Date(b.gradedAt).getTime())
      .slice(-10);

    return { student, studentClass, subjectPerformance, grades, performanceTrend };
  }, [student]);

  const notFound = !isLoading && !error && !student;

  const pctColor = (pct: number) =>
    pct >= 80 ? 'text-on-success-container' : pct >= 60 ? 'text-on-warning-container' : 'text-on-error-container';

  return (
    <>
      <SEOHead
        title={student ? `${student.displayName} - Student Details` : 'Student Details'}
        description={student ? `Performance and grades for ${student.displayName}` : 'View student details'}
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
              <Icon name="person_off" size={48} className="text-muted-foreground/40" />
              <p className="text-lg font-medium">Student not found</p>
              <p className="text-sm text-muted-foreground">
                The student you&apos;re looking for doesn&apos;t exist.
              </p>
              <Button asChild>
                <Link to="/teacher/students">
                  <Icon name="arrow_back" size={16} className="mr-1" />
                  Back to Students
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <DataFetchWrapper
            data={detailData}
            isLoading={isLoading}
            error={error}
            onRetry={() => refetch()}
            loadingType="detail"
          >
            {(data) => (
              <>
                <motion.div variants={listItem}>
                  <Button variant="ghost" size="sm" asChild className="gap-1 -ml-2">
                    <Link to="/teacher/students">
                      <Icon name="arrow_back" size={16} />
                      Back to Students
                    </Link>
                  </Button>
                </motion.div>

                <motion.div variants={listItem}>
                  <Card variant="elevated">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-5">
                        <Avatar className="h-16 w-16">
                          <AvatarFallback className="text-lg">{getInitials(data.student.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h1 className="text-headline-sm">{data.student.displayName}</h1>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Icon name="badge" size={15} />
                              {data.student.studentId}
                            </span>
                            <span className="flex items-center gap-1">
                              <Icon name="school" size={15} />
                              {data.studentClass?.name ?? 'Unknown Class'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Icon name="email" size={15} />
                              {data.student.email}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={listItem}>
                  <Card variant="elevated">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-title-md flex items-center gap-2">
                        <Icon name="menu_book" size={18} className="text-muted-foreground" />
                        Subject Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.subjectPerformance.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                          <Icon name="graded" size={32} className="text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No grades recorded yet</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {data.subjectPerformance.map((sub) => (
                            <div key={sub.id} className="p-3 rounded-lg border bg-card space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: sub.color }} />
                                <p className="text-sm font-medium">{sub.name}</p>
                              </div>
                              <div className="flex items-end justify-between">
                                <p className={`text-2xl font-bold tabular-nums ${pctColor(sub.percentage)}`}>
                                  {sub.percentage}%
                                </p>
                                <Badge
                                  variant={sub.percentage >= 80 ? 'success' : sub.percentage >= 60 ? 'warning' : 'destructive'}
                                >
                                  {getLetterGrade(sub.percentage)}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={listItem}>
                  <Card variant="elevated">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-title-md flex items-center gap-2">
                        <Icon name="graded" size={18} className="text-muted-foreground" />
                        All Grades
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {data.grades.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                          <Icon name="graded" size={32} className="text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">No grades yet</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/30">
                                <th className="text-left font-medium text-muted-foreground px-4 py-3">Item</th>
                                <th className="text-left font-medium text-muted-foreground px-4 py-3">Subject</th>
                                <th className="text-center font-medium text-muted-foreground px-4 py-3">Score</th>
                                <th className="text-center font-medium text-muted-foreground px-4 py-3">Percentage</th>
                                <th className="text-right font-medium text-muted-foreground px-4 py-3">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.grades.map((grade) => (
                                <tr key={grade.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                  <td className="px-4 py-3">
                                    <p className="font-medium">{grade.itemName}</p>
                                    <Badge variant="secondary" className="text-[10px] mt-0.5">
                                      {grade.type}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground">
                                    {grade.subject?.name ?? 'Unknown'}
                                  </td>
                                  <td className="px-4 py-3 text-center tabular-nums">
                                    {grade.score}/{grade.maxScore}
                                  </td>
                                  <td className={`px-4 py-3 text-center font-semibold tabular-nums ${pctColor(grade.percentage)}`}>
                                    {grade.percentage}%
                                  </td>
                                  <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                                    {formatDate(grade.gradedAt)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={listItem}>
                  <Card variant="elevated">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-title-md flex items-center gap-2">
                        <Icon name="trending_up" size={18} className="text-muted-foreground" />
                        Performance Trend
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.performanceTrend.length < 2 ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                          <Icon name="show_chart" size={32} className="text-muted-foreground/40" />
                          <p className="text-sm text-muted-foreground">
                            Need at least 2 graded items to show a trend
                          </p>
                        </div>
                      ) : (
                        <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-2">
                          {data.performanceTrend.map((grade, idx) => {
                            const prevGrade = idx > 0 ? data.performanceTrend[idx - 1] : null;
                            const diff = prevGrade != null ? grade.percentage - prevGrade.percentage : null;
                            return (
                              <motion.div
                                key={grade.id}
                                variants={listItem}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{grade.itemName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {grade.subject?.name ?? 'Unknown'} &middot; {formatDate(grade.gradedAt)}
                                  </p>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                  <span className={`font-semibold tabular-nums ${pctColor(grade.percentage)}`}>
                                    {grade.percentage}%
                                  </span>
                                  {diff != null && diff !== 0 && (
                                    <span className={`flex items-center text-xs font-medium tabular-nums ${diff > 0 ? 'text-on-success-container' : 'text-on-error-container'}`}>
                                      <Icon name={diff > 0 ? 'arrow_upward' : 'arrow_downward'} size={14} />
                                      {Math.abs(diff)}
                                    </span>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={listItem}>
                  <Card variant="elevated">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-title-md flex items-center gap-2">
                        <Icon name="notes" size={18} className="text-muted-foreground" />
                        Feedback &amp; Notes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Add private notes about this student. These are only visible to you.
                        </p>
                        <Textarea placeholder="Write your notes here..." className="min-h-[100px]" />
                        <div className="flex justify-end">
                          <Button size="sm" className="gap-1">
                            <Icon name="save" size={16} />
                            Save Notes
                          </Button>
                        </div>
                      </div>
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
