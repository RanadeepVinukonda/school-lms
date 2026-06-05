import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { useQuery } from '@tanstack/react-query';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import { getAllSubjects, getEnrollmentsByStudent } from '@/services/dataService';

export default function SubjectsPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-subjects', user?.id],
    queryFn: async () => {
      const [allSubjects, enrollments] = await Promise.all([
        getAllSubjects(),
        getEnrollmentsByStudent(user!.id),
      ]);
      const subjects = enrollments
        .map((enrollment) => {
          const subject = allSubjects.find((s) => s.id === enrollment.courseId);
          if (!subject) return null;
          return { ...subject, status: enrollment.status };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);
      return subjects;
    },
    enabled: !!user,
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
            <h1 className="text-headline-sm font-bold">My Subjects</h1>
            <p className="text-body-md text-muted-foreground">Subjects you are currently enrolled in</p>
          </div>
        </div>

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Failed to load subjects') : null}
          loadingType="card"
          emptyMessage="You are not currently enrolled in any subjects. Subjects will appear here once assigned."
          emptyIcon={<Icon name="menu_book" size={40} />}
          emptyAction={
            <Button asChild>
              <Link to="/student/subjects">
                <Icon name="add" size={16} className="mr-2" />
                Browse Subjects
              </Link>
            </Button>
          }
          onRetry={() => refetch()}
          errorTitle="Failed to load subjects"
        >
          {(subjects) => (
            <motion.div
              variants={listContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {subjects.map((subject) => (
                <motion.div key={subject.id} variants={listItem}>
                  <Link to={`/student/subjects/${subject.id}`} className="block h-full">
                    <Card variant="elevated" className="overflow-hidden transition-all duration-300 h-full group">
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
                            <Icon name={subject.icon ?? 'menu_book'} size={24} className="text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold" style={{ color: subject.color }}>
                              {subject.name}
                            </h3>
                            <p className="text-body-sm text-muted-foreground">{subject.code}</p>
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-[10px]">
                            {subject.category}
                          </Badge>
                        </div>
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
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
