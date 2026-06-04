import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { getLetterGrade } from '@/lib/format';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { useQuery } from '@tanstack/react-query';
import {
  mockUsers,
  mockEnrollments,
  mockSubjects,
  mockGrades,
  mockClasses,
  mockAssignments,
} from '@/lib/mockData';

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
      <Skeleton className="h-40 rounded-xl" />
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
        <p className="text-lg font-semibold">Failed to load profile</p>
        <p className="text-sm text-muted-foreground">Please check your connection and try again</p>
        <Button variant="outline" onClick={onRetry} className="gap-2">
          <Icon name="refresh" size={16} />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

export default function StudentProfilePage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['student-profile'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      const student = mockUsers.student1;
      const enrollments = mockEnrollments.filter((e) => e.studentId === student.id);
      const enrolledSubjects = enrollments
        .map((e) => {
          const subject = mockSubjects.find((s) => s.id === e.subjectId);
          if (!subject) return null;
          return { ...subject, progress: e.progress };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

      const studentClass = mockClasses.find((c) => c.id === student.classId);

      const grades = mockGrades.filter((g) => g.studentId === student.id);
      const gradesWithSubject = grades.map((g) => ({
        ...g,
        subject: mockSubjects.find((s) => s.id === g.subjectId)?.name ?? 'Unknown',
      }));

      return { student, enrolledSubjects, studentClass, grades: gradesWithSubject };
    },
  });

  return (
    <>
      <SEOHead title="My Profile" description="Your student profile and academic summary" />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 max-w-4xl mx-auto space-y-6 pb-20"
      >
        <h1 className="text-2xl font-bold">My Profile</h1>

        {isLoading ? (
          <ProfileSkeleton />
        ) : isError ? (
          <ErrorDisplay onRetry={() => refetch()} />
        ) : !data ? null : (
          <>
            {/* User Info Card */}
            <motion.div variants={listItem} initial="hidden" animate="show">
              <Card>
                <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-5">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon name="account_circle" size={40} className="text-primary" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-xl font-bold">{data.student.displayName}</h2>
                    <p className="text-sm text-muted-foreground">
                      Student &middot; ID: {data.student.studentId}
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        <Icon name="mail" size={12} className="mr-1" />
                        {data.student.email}
                      </Badge>
                      {data.studentClass && (
                        <Badge variant="outline" className="text-xs">
                          <Icon name="group" size={12} className="mr-1" />
                          {data.studentClass.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                <Link to="/student/profile">
                  <Icon name="settings" size={14} />
                  Edit
                </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Enrolled Subjects */}
            <motion.div variants={listItem} initial="hidden" animate="show">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon name="menu_book" size={18} />
                    Enrolled Subjects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.enrolledSubjects.length === 0 ? (
                    <div className="flex flex-col items-center py-6 text-center">
                      <Icon name="menu_book" size={32} className="text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">Not enrolled in any subjects</p>
                    </div>
                  ) : (
                    <motion.div
                      variants={listContainer}
                      initial="hidden"
                      animate="show"
                      className="space-y-3"
                    >
                      {data.enrolledSubjects.map((subject) => (
                        <motion.div
                          key={subject.id}
                          variants={listItem}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                        >
                          <div
                            className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${subject.color}15` }}
                          >
                            <Icon name={subject.icon} size={20} style={{ color: subject.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/student/subjects/${subject.id}`}
                              className="text-sm font-medium hover:underline truncate block"
                            >
                              {subject.name}
                            </Link>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={subject.progress} className="flex-1 h-1.5" />
                              <span className="text-xs font-medium tabular-nums">
                                {subject.progress}%
                              </span>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                            {subject.category}
                          </Badge>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Grades */}
            <motion.div variants={listItem} initial="hidden" animate="show">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon name="grade" size={18} />
                    Recent Grades
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {data.grades.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center px-6">
                      <Icon name="grade" size={32} className="text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No grades recorded yet</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead className="text-center">Score</TableHead>
                          <TableHead className="text-center">Grade</TableHead>
                          <TableHead className="text-right">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.grades.map((grade) => {
                          const letterGrade = getLetterGrade(grade.percentage);
                          const gradeColor =
                            grade.percentage >= 80
                              ? 'text-emerald-600'
                              : grade.percentage >= 60
                                ? 'text-amber-600'
                                : 'text-red-600';

                          return (
                            <TableRow key={grade.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Icon
                                    name={grade.type === 'assignment' ? 'assignment' : 'quiz'}
                                    size={14}
                                    className="text-muted-foreground flex-shrink-0"
                                  />
                                  <span className="text-sm font-medium truncate max-w-[180px]">
                                    {grade.itemName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {grade.subject}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="text-sm tabular-nums">
                                  {grade.score}/{grade.maxScore}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={cn('text-sm font-bold', gradeColor)}>
                                  {letterGrade}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(grade.gradedAt)}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </motion.div>
    </>
  );
}
