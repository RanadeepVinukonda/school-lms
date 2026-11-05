import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { useQuery } from '@tanstack/react-query';
import { scrollReveal, staggerContainer, cardStackReveal, scaleFadeIn } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import { getAllSubjects, getClass } from '@/services/dataService';

export default function SubjectsPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-subjects', user?.id, user?.classId],
    queryFn: async () => {
      if (!user?.classId) return [];
      const [allSubjects, studentClass] = await Promise.all([
        getAllSubjects(),
        getClass(user.classId),
      ]);
      if (!studentClass || !studentClass.subjectIds) return [];
      const subjects = studentClass.subjectIds
        .map((subId) => {
          const subject = allSubjects.find((s) => s.id === subId);
          if (!subject) return null;
          return { ...subject, status: 'active' };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);
      return subjects;
    },
    enabled: !!user,
  });

  return (
    <>
      <SEOHead title="My Subjects" description="View your subjects" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <motion.div variants={scrollReveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-headline-sm md:text-headline-md font-bold tracking-tight">My Subjects</h1>
              <p className="text-body-md text-muted-foreground">Subjects in your curriculum</p>
            </div>
          </div>
        </motion.div>

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Failed to load subjects') : null}
          loadingType="card"
          emptyMessage="No subjects have been assigned to your class yet."
          emptyIcon={<Icon name="menu_book" size={40} />}
          onRetry={() => refetch()}
          errorTitle="Failed to load subjects"
        >
          {(subjects) => (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4"
            >
              {subjects.map((subject) => (
                <motion.div key={subject.id} variants={cardStackReveal} custom={0}>
                  <Link to={`/student/subjects/${subject.id}`} className="block h-full">
                    <Card className="overflow-hidden transition-all duration-300 h-full border-border/60 group">
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
                            <h3 className="text-title-md font-bold" style={{ color: subject.color }}>
                              {subject.name}
                            </h3>
                            <p className="text-body-sm text-muted-foreground">{subject.code}</p>
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-5 space-y-3">
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
