import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@/components/ui/Icon';
import { useQuery } from '@tanstack/react-query';
import { mockUsers, mockEnrollments, mockSubjects } from '@/lib/mockData';
import { pageTransition, listContainer, listItem } from '@/lib/motion';

function SubjectsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-0">
            <Skeleton className="h-32 rounded-t-lg" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ErrorDisplay({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-16">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Icon name="error" size={32} className="text-destructive" />
        </div>
        <p className="text-lg font-semibold">Failed to load subjects</p>
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
      <CardContent className="flex flex-col items-center gap-4 py-16">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
          <Icon name="menu_book" size={40} className="text-muted-foreground" />
        </div>
        <p className="text-lg font-semibold">No subjects enrolled</p>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          You are not currently enrolled in any subjects. Subjects will appear here once assigned.
        </p>
        <Button asChild>
          <Link to="/courses">
            <Icon name="add" size={16} className="mr-2" />
            Browse Courses
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SubjectsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['student-subjects'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400));
      const student = mockUsers.student1;
      const enrollments = mockEnrollments.filter((e) => e.studentId === student.id);
      const subjects = enrollments
        .map((enrollment) => {
          const subject = mockSubjects.find((s) => s.id === enrollment.subjectId);
          if (!subject) return null;
          return { ...subject, progress: enrollment.progress, status: enrollment.status };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);
      return subjects;
    },
  });

  return (
    <>
      <SEOHead title="My Subjects" description="View your enrolled subjects" />
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="p-4 max-w-5xl mx-auto space-y-4 pb-20"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Subjects</h1>
            <p className="text-sm text-muted-foreground">Subjects you are currently enrolled in</p>
          </div>
        </div>

        {isLoading ? (
          <SubjectsGridSkeleton />
        ) : isError ? (
          <ErrorDisplay onRetry={() => refetch()} />
        ) : !data || data.length === 0 ? (
          <EmptyDisplay />
        ) : (
          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {data.map((subject) => (
              <motion.div key={subject.id} variants={listItem}>
                <Link to={`/student/subjects/${subject.id}`} className="block h-full">
                  <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 h-full group">
                    <div
                      className="h-32 flex items-end p-5 relative"
                      style={{ backgroundColor: `${subject.color}20` }}
                    >
                      <div
                        className="absolute inset-0 opacity-10"
                        style={{ backgroundColor: subject.color }}
                      />
                      <div className="flex items-center gap-3 relative z-10">
                        <div
                          className="h-12 w-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: subject.color }}
                        >
                          <Icon name={subject.icon} size={24} className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold" style={{ color: subject.color }}>
                            {subject.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">{subject.code}</p>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-[10px]">
                          {subject.category}
                        </Badge>
                        <span className="text-xs font-medium tabular-nums">{subject.progress}%</span>
                      </div>
                      <Progress value={subject.progress} className="h-2" />
                      <Button
                        size="sm"
                        className="w-full gap-2 group-hover:gap-3 transition-all"
                        variant="secondary"
                      >
                        <Icon name="play_arrow" size={16} />
                        Continue
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
