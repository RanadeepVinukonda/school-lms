import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { teacherClassSubjectService } from '@/services/teacherClassSubjectService';
import { getAllSubjects, getAllClasses } from '@/services/dataService';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';

export default function TeacherClassDetailPage() {
  const { id: classId } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-class-detail', classId, user?.id],
    queryFn: async () => {
      const [assignmentsRes, allClasses, allSubjects] = await Promise.all([
        teacherClassSubjectService.getMyAssignments(),
        getAllClasses(),
        getAllSubjects(),
      ]);

      const assignments = assignmentsRes.data ?? [];
      const classData = allClasses.find((c) => c.id === classId);
      const classAssignments = assignments.filter(
        (a) => a.classId === classId,
      );

      const subjectIds = [...new Set(classAssignments.map((a) => a.subjectId))];
      const subjects = allSubjects.filter((s) => subjectIds.includes(s.id));

      return {
        className: classData?.name ?? classId ?? 'Unknown',
        subjects: subjects.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          thumbnail: s.thumbnail,
        })),
      };
    },
    enabled: !!classId && !!user?.id,
  });

  return (
    <>
      <SEOHead title={data?.className ?? 'Class'} description={`Subjects for ${data?.className}`} />
      <div



        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to={ROUTES.TEACHER_DASHBOARD}>
                <Icon name="arrow_back" size={20} />
              </Link>
            </Button>
            <div>
              <h1 className="text-headline-sm">{data?.className ?? 'Loading...'}</h1>
              <p className="text-body-md text-muted-foreground">Select a subject to view textbooks and materials</p>
            </div>
          </div>
        </div>

        <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="card">
          {(d) => (
            <div



              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {d.subjects.length === 0 ? (
                <div className="col-span-full flex flex-col items-center gap-3 py-16 text-center">
                  <Icon name="book" size={48} className="text-muted-foreground/30" />
                  <p className="text-title-sm font-medium text-muted-foreground">No subjects assigned</p>
                  <p className="text-body-md text-muted-foreground/60">
                    You have not been assigned to any subjects in this class.
                  </p>
                </div>
              ) : (
                d.subjects.map((subject) => (
                  <div key={subject.id}>
                    <Link
                      to={ROUTES.TEACHER_SUBJECT(classId!, subject.id)}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                    >
                      <Card className="border-border/60 hover:shadow-md transition-shadow cursor-pointer h-full">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-xl bg-secondary-container flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {subject.thumbnail ? (
                                <img src={subject.thumbnail} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Icon name="book" size={24} className="text-on-secondary-container" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-title-sm font-semibold truncate">{subject.name}</p>
                              {subject.code && (
                                <Badge variant="outline" className="mt-1 text-label-xs font-mono">
                                  {subject.code}
                                </Badge>
                              )}
                              <p className="text-label-xs text-muted-foreground mt-2">View textbooks &rarr;</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}
        </DataFetchWrapper>
      </div>
    </>
  );
}
