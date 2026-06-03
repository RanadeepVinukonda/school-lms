import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/Icon';
import { OptionsSelect } from '@/components/ui/select';
import { cn, getInitials } from '@/lib/utils';
import { getLetterGrade } from '@/lib/format';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { mockUsers, mockClasses, mockSubjects, mockEnrollments, mockGrades } from '@/lib/mockData';

interface StudentRow {
  id: string;
  displayName: string;
  studentId: string;
  className: string;
  overallPercentage: number;
  subjectCount: number;
}

function StudentListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
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
        <p className="text-lg font-semibold">Failed to load students</p>
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
      <CardContent className="flex flex-col items-center gap-3 py-12">
        <Icon name="group" size={48} className="text-muted-foreground/40" />
        <p className="text-lg font-medium">No students found</p>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          {mockSubjects.length > 0
            ? 'No students are enrolled in the selected subject yet.'
            : 'No subjects available. Contact your administrator.'}
        </p>
      </CardContent>
    </Card>
  );
}

export default function TeacherStudentsPage() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');

  const { isLoading, isError, refetch } = useQuery({
    queryKey: ['teacher-students'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 500));
      return null;
    },
  });

  const subjectOptions = useMemo(
    () => [
      { value: 'all', label: 'All Subjects' },
      ...mockSubjects.map((s) => ({ value: s.id, label: s.name })),
    ],
    [],
  );

  const students = useMemo(() => {
    const studentIds =
      selectedSubjectId === 'all'
        ? [...new Set(mockEnrollments.map((e) => e.studentId))]
        : mockEnrollments
            .filter((e) => e.subjectId === selectedSubjectId)
            .map((e) => e.studentId);

    return studentIds
      .map((id) => {
        const user = Object.values(mockUsers).find(
          (u) => u.id === id && u.role === 'student',
        );
        if (!user) return null;

        const studentUser = user as typeof mockUsers.student1;
        const studentClass = mockClasses.find((c) => c.id === studentUser.classId);
        const studentGrades = mockGrades.filter((g) => g.studentId === id);
        const overallPercentage =
          studentGrades.length > 0
            ? Math.round(
                studentGrades.reduce((sum, g) => sum + g.percentage, 0) /
                  studentGrades.length,
              )
            : 0;

        const enrolledSubjects = mockEnrollments.filter((e) => e.studentId === id);

        return {
          id: studentUser.id,
          displayName: studentUser.displayName,
          studentId: studentUser.studentId ?? id,
          className: studentClass?.name ?? 'Unknown',
          overallPercentage,
          subjectCount: enrolledSubjects.length,
        } as StudentRow;
      })
      .filter((s): s is StudentRow => s !== null)
      .sort((a, b) => b.overallPercentage - a.overallPercentage);
  }, [selectedSubjectId]);

  return (
    <>
      <SEOHead
        title="My Students"
        description="View and manage your students"
        canonical="/teacher/students"
      />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 max-w-5xl mx-auto space-y-6 pb-20"
      >
        {/* Header */}
        <motion.div
          variants={listItem}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold">My Students</h1>
            <p className="text-sm text-muted-foreground">
              {students.length} student{students.length !== 1 ? 's' : ''} enrolled
            </p>
          </div>
          <div className="w-full sm:w-56">
            <OptionsSelect
              options={subjectOptions}
              placeholder="All Subjects"
              value={selectedSubjectId}
              onValueChange={setSelectedSubjectId}
            />
          </div>
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <StudentListSkeleton />
        ) : isError ? (
          <ErrorDisplay onRetry={() => refetch()} />
        ) : students.length === 0 ? (
          <EmptyDisplay />
        ) : (
          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="space-y-2"
          >
            {students.map((student) => {
              const letterGrade = getLetterGrade(student.overallPercentage);
              const isHighPerformer = student.overallPercentage >= 80;
              const isLowPerformer = student.overallPercentage < 60;

              return (
                <motion.div key={student.id} variants={listItem}>
                  <Link to={`/teacher/students/${student.id}`}>
                    <Card className="hover:shadow-md transition-all duration-200 group cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-11 w-11">
                            <AvatarFallback>
                              {getInitials(student.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-semibold truncate group-hover:text-primary transition-colors">
                                {student.displayName}
                              </p>
                              <Badge
                                variant={
                                  isHighPerformer
                                    ? 'success'
                                    : isLowPerformer
                                      ? 'destructive'
                                      : 'secondary'
                                }
                                className="text-[10px] flex-shrink-0"
                              >
                                {letterGrade}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Icon name="badge" size={13} />
                                {student.studentId}
                              </span>
                              <span className="flex items-center gap-1">
                                <Icon name="school" size={13} />
                                {student.className}
                              </span>
                              <span className="flex items-center gap-1">
                                <Icon name="menu_book" size={13} />
                                {student.subjectCount} subject
                                {student.subjectCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p
                              className={cn(
                                'text-lg font-bold tabular-nums',
                                isHighPerformer && 'text-emerald-600',
                                isLowPerformer && 'text-destructive',
                              )}
                            >
                              {student.overallPercentage}%
                            </p>
                            <p className="text-[10px] text-muted-foreground">overall</p>
                          </div>
                          <Icon
                            name="chevron_right"
                            size={20}
                            className="text-muted-foreground/40 flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
