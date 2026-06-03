import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/Icon';
import { cn, getInitials } from '@/lib/utils';
import { formatDate, getLetterGrade } from '@/lib/format';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import {
  mockUsers,
  mockClasses,
  mockSubjects,
  mockEnrollments,
  mockGrades,
  mockAssignments,
  mockExams,
} from '@/lib/mockData';

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
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
        <p className="text-lg font-semibold">Failed to load student details</p>
        <p className="text-sm text-muted-foreground">Please check your connection and try again</p>
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <Icon name="refresh" size={16} />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

export default function TeacherStudentDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { isLoading, isError, refetch } = useQuery({
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

  const studentClass = useMemo(
    () => mockClasses.find((c) => c.id === student?.classId) ?? null,
    [student],
  );

  const grades = useMemo(() => {
    if (!id) return [];
    return mockGrades
      .filter((g) => g.studentId === id)
      .map((g) => ({
        ...g,
        subject: mockSubjects.find((s) => s.id === g.subjectId),
      }))
      .sort(
        (a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime(),
      );
  }, [id]);

  const subjectPerformance = useMemo(() => {
    if (!id) return [];
    const bySubject = new Map<string, { scores: number[]; maxScores: number[] }>();
    mockGrades
      .filter((g) => g.studentId === id)
      .forEach((g) => {
        const existing = bySubject.get(g.subjectId) ?? { scores: [], maxScores: [] };
        existing.scores.push(g.score);
        existing.maxScores.push(g.maxScore);
        bySubject.set(g.subjectId, existing);
      });
    return mockSubjects
      .map((sub) => {
        const data = bySubject.get(sub.id);
        if (!data) return null;
        const totalScore = data.scores.reduce((a, b) => a + b, 0);
        const totalMax = data.maxScores.reduce((a, b) => a + b, 0);
        const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
        return { ...sub, percentage };
      })
      .filter(Boolean) as (typeof mockSubjects[0] & { percentage: number })[];
  }, [id]);

  const performanceTrend = useMemo(() => {
    return [...grades]
      .sort(
        (a, b) => new Date(a.gradedAt).getTime() - new Date(b.gradedAt).getTime(),
      )
      .slice(-10);
  }, [grades]);

  if (isLoading) return <DetailSkeleton />;

  if (isError) return <ErrorDisplay onRetry={() => refetch()} />;

  if (!student) {
    return (
      <div className="p-4">
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
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={`${student.displayName} - Student Details`}
        description={`Performance and grades for ${student.displayName}`}
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
            <Link to="/teacher/students">
              <Icon name="arrow_back" size={16} />
              Back to Students
            </Link>
          </Button>
        </motion.div>

        {/* Profile Header */}
        <motion.div variants={listItem}>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-5">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {getInitials(student.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-bold">{student.displayName}</h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Icon name="badge" size={15} />
                      {student.studentId}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="school" size={15} />
                      {studentClass?.name ?? 'Unknown Class'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="email" size={15} />
                      {student.email}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Subject Performance Summary */}
        <motion.div variants={listItem}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon name="menu_book" size={18} className="text-muted-foreground" />
                Subject Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subjectPerformance.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Icon name="graded" size={32} className="text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No grades recorded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subjectPerformance.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3 rounded-lg border bg-card space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: sub.color }}
                        />
                        <p className="text-sm font-medium">{sub.name}</p>
                      </div>
                      <div className="flex items-end justify-between">
                        <p
                          className={cn(
                            'text-2xl font-bold tabular-nums',
                            sub.percentage >= 80 && 'text-emerald-600',
                            sub.percentage >= 60 &&
                              sub.percentage < 80 &&
                              'text-amber-600',
                            sub.percentage < 60 && 'text-destructive',
                          )}
                        >
                          {sub.percentage}%
                        </p>
                        <Badge
                          variant={
                            sub.percentage >= 80
                              ? 'success'
                              : sub.percentage >= 60
                                ? 'warning'
                                : 'destructive'
                          }
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

        {/* Grades Table */}
        <motion.div variants={listItem}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon name="graded" size={18} className="text-muted-foreground" />
                All Grades
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {grades.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Icon name="graded" size={32} className="text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No grades yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Item
                        </th>
                        <th className="text-left font-medium text-muted-foreground px-4 py-3">
                          Subject
                        </th>
                        <th className="text-center font-medium text-muted-foreground px-4 py-3">
                          Score
                        </th>
                        <th className="text-center font-medium text-muted-foreground px-4 py-3">
                          Percentage
                        </th>
                        <th className="text-right font-medium text-muted-foreground px-4 py-3">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {grades.map((grade) => {
                        const pctColor =
                          grade.percentage >= 80
                            ? 'text-emerald-600'
                            : grade.percentage >= 60
                              ? 'text-amber-600'
                              : 'text-destructive';
                        return (
                          <tr
                            key={grade.id}
                            className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <p className="font-medium">{grade.itemName}</p>
                              <Badge
                                variant="secondary"
                                className="text-[10px] mt-0.5"
                              >
                                {grade.type}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {grade.subject?.name ?? 'Unknown'}
                            </td>
                            <td className="px-4 py-3 text-center tabular-nums">
                              {grade.score}/{grade.maxScore}
                            </td>
                            <td
                              className={cn(
                                'px-4 py-3 text-center font-semibold tabular-nums',
                                pctColor,
                              )}
                            >
                              {grade.percentage}%
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                              {formatDate(grade.gradedAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Performance Trend */}
        <motion.div variants={listItem}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon name="trending_up" size={18} className="text-muted-foreground" />
                Performance Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {performanceTrend.length < 2 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Icon name="show_chart" size={32} className="text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Need at least 2 graded items to show a trend
                  </p>
                </div>
              ) : (
                <motion.div
                  variants={listContainer}
                  initial="hidden"
                  animate="show"
                  className="space-y-2"
                >
                  {performanceTrend.map((grade, idx) => {
                    const prevGrade = idx > 0 ? performanceTrend[idx - 1] : null;
                    const diff =
                      prevGrade != null ? grade.percentage - prevGrade.percentage : null;
                    return (
                      <motion.div
                        key={grade.id}
                        variants={listItem}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{grade.itemName}</p>
                          <p className="text-xs text-muted-foreground">
                            {grade.subject?.name ?? 'Unknown'} &middot;{' '}
                            {formatDate(grade.gradedAt)}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <span
                            className={cn(
                              'font-semibold tabular-nums',
                              grade.percentage >= 80 && 'text-emerald-600',
                              grade.percentage >= 60 &&
                                grade.percentage < 80 &&
                                'text-amber-600',
                              grade.percentage < 60 && 'text-destructive',
                            )}
                          >
                            {grade.percentage}%
                          </span>
                          {diff != null && diff !== 0 && (
                            <span
                              className={cn(
                                'flex items-center text-xs font-medium tabular-nums',
                                diff > 0
                                  ? 'text-emerald-600'
                                  : 'text-destructive',
                              )}
                            >
                              <Icon
                                name={diff > 0 ? 'arrow_upward' : 'arrow_downward'}
                                size={14}
                              />
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

        {/* Feedback / Notes */}
        <motion.div variants={listItem}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon name="notes" size={18} className="text-muted-foreground" />
                Feedback &amp; Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Add private notes about this student. These are only visible to you.
                </p>
                <Textarea
                  placeholder="Write your notes here..."
                  className="min-h-[100px]"
                />
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
      </motion.div>
    </>
  );
}
