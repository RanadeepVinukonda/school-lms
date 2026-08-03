import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/hooks/useTranslation';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { teacherClassSubjectService } from '@/services/teacherClassSubjectService';
import { getAllSubjects, getAllClasses } from '@/services/dataService';
import { getTextbooksBySubject } from '@/services/textbookService';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';

export default function TeacherSubjectDetailPage() {
  const { _ } = useTranslation();
  const { classId, subjectId } = useParams<{ classId: string; subjectId: string }>();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher-subject-detail', classId, subjectId, user?.id],
    queryFn: async () => {
      const [allClasses, allSubjects, textbooks] = await Promise.all([
        getAllClasses(),
        getAllSubjects(),
        getTextbooksBySubject(subjectId!),
      ]);

      const classData = allClasses.find((c) => c.id === classId);
      const subjectData = allSubjects.find((s) => s.id === subjectId);

      return {
        className: `${classData?.name ?? ''}${(classData as any)?.section ? ` - ${(classData as any).section}` : ''}` || classId || 'Unknown',
        subjectName: subjectData?.name ?? subjectId ?? 'Unknown',
        textbooks: textbooks.map((tb: any) => ({
          id: tb.id,
          title: tb.title,
          description: tb.description,
          thumbnail: tb.thumbnail,
          gradeLevel: tb.gradeLevel,
        })),
      };
    },
    enabled: !!classId && !!subjectId && !!user?.id,
  });

  return (
    <>
      <SEOHead title={data?.subjectName ?? _('Subject')} description={_('Textbooks for') + ` ${data?.subjectName}`} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto space-y-16 pb-32"
      >
        <motion.div variants={cardStackReveal} custom={0}>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to={ROUTES.TEACHER_CLASS(classId!)}>
                <Icon name="arrow_back" size={20} />
              </Link>
            </Button>
            <div>
              <h1 className="text-headline-sm">{data?.subjectName ?? _('Loading...')}</h1>
              {data?.className && (
                <p className="text-sm text-muted-foreground">{data.className}</p>
              )}
            </div>
          </div>
        </motion.div>

        <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="card">
          {(d) => (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {d.textbooks.length === 0 ? (
                <div className="col-span-full flex flex-col items-center gap-3 py-16 text-center">
                  <Icon name="menu_book" size={48} className="text-muted-foreground/30" />
                  <p className="text-base font-medium text-muted-foreground">{_('No textbooks yet')}</p>
                  <p className="text-sm text-muted-foreground/60">
                    {_('There are no textbooks assigned to this subject.')}
                  </p>
                  <Button asChild variant="outline" className="mt-2">
                    <Link to={`${ROUTES.TEACHER_TEXTBOOK_UPLOAD}?classId=${classId}&subjectId=${subjectId}`}>
                      <Icon name="add" size={16} className="mr-2" />
                      {_('Upload Textbook')}
                    </Link>
                  </Button>
                </div>
              ) : (
                d.textbooks.map((tb) => (
                  <motion.div key={tb.id} variants={scrollReveal}>
                    <Link
                      to={ROUTES.TEACHER_TEXTBOOK(tb.id)}
                      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
                    >
                      <Card className="border-border/60 hover:shadow-md transition-shadow cursor-pointer h-full">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-xl bg-surface-variant flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {tb.thumbnail ? (
                                <img src={tb.thumbnail} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Icon name="menu_book" size={28} className="text-on-surface-variant" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-base font-semibold line-clamp-2">{tb.title}</p>
                              {tb.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tb.description}</p>
                              )}
                              {tb.gradeLevel && (
                                <p className="text-xs text-muted-foreground mt-2">{_('Grade')} {tb.gradeLevel}</p>
                              )}
                              <p className="text-xs text-primary mt-2">{_('Open textbook')} &rarr;</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
