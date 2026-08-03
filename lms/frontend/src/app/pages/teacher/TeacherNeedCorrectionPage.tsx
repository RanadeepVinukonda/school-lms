import { useTranslation } from '@/hooks/useTranslation';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { ROUTES } from '@/lib/constants';
import { staggerContainer, cardStackReveal } from '@/lib/motion';
import { useTeacherReviewData } from '@/hooks/useTeacherReviewData';

export default function TeacherNeedCorrectionPage() {
  const { _ } = useTranslation();
  const { data, isLoading, error, refetch } = useTeacherReviewData();

  return (
    <>
      <SEOHead title={_('Need Correction')} description={_('Exams that still need to be marked and corrected')} canonical="/teacher/need-correction" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32"
      >
        <div className="mb-6 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon-sm">
            <Link to={ROUTES.TEACHER_DASHBOARD}><Icon name="arrow_back" size={20} /></Link>
          </Button>
          <div>
            <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">{_('Need Correction')}</h1>
            <p className="text-body-md text-muted-foreground mt-1">{_('Exams that still need to be marked and corrected')}</p>
          </div>
        </div>

        <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="card">
          {(d) => (
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
              {d.needCorrection.length === 0 ? (
                <Card className="border-border/60">
                  <CardContent className="p-10 text-center">
                    <Icon name="fact_check" size={40} className="text-success mx-auto mb-3" />
                    <p className="text-title-sm font-bold">{_('All caught up')}</p>
                    <p className="text-label-sm text-muted-foreground mt-1">{_('Every exam has been marked. No corrections pending.')}</p>
                  </CardContent>
                </Card>
              ) : (
                d.needCorrection.map((item, idx) => {
                  const exam = item.exam;
                  return (
                    <motion.div key={exam.id} variants={cardStackReveal} custom={idx}>
                      <Card className="border-border/60">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="h-11 w-11 rounded-xl bg-error-container flex items-center justify-center shrink-0">
                                <Icon name="fact_check" size={20} className="text-error" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-title-sm font-bold">{exam.title}</p>
                                <p className="text-label-sm text-muted-foreground truncate">
                                  {item.subjectName} · {_('No corrections yet')}
                                </p>
                              </div>
                            </div>
                            <Badge variant="destructive">{_('Pending')}</Badge>
                          </div>

                          <div className="mt-4 flex items-center gap-3 flex-wrap">
                            <Button asChild size="sm">
                              <Link to={ROUTES.TEACHER_EXAM_CORRECT(exam.id)}>
                                <Icon name="edit_note" size={14} className="mr-1" /> {_('Start correction')}
                              </Link>
                            </Button>
                            {exam.duration ? (
                              <span className="text-label-xs text-muted-foreground">{exam.duration} {_('min')}</span>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}