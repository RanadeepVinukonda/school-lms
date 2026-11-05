import { useTranslation } from '@/hooks/useTranslation';
import { Link } from 'react-router-dom';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { ROUTES } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { useTeacherReviewData } from '@/hooks/useTeacherReviewData';

export default function TeacherLateSubmissionsPage() {
  const { _ } = useTranslation();
  const { data, isLoading, error, refetch } = useTeacherReviewData();

  return (
    <>
      <SEOHead title={_('Late Submissions')} description={_('Assignments that have passed their due date')} canonical="/teacher/late-submissions" />
      <div

        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32"
      >
        <div className="mb-6 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon-sm">
            <Link to={ROUTES.TEACHER_DASHBOARD}><Icon name="arrow_back" size={20} /></Link>
          </Button>
          <div>
            <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">{_('Late Submissions')}</h1>
            <p className="text-body-md text-muted-foreground mt-1">{_('Assignments that have passed their due date')}</p>
          </div>
        </div>

        <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="card">
          {(d) => (
            <div className="space-y-4">
              {d.lateSubmissions.length === 0 ? (
                <Card className="border-border/60">
                  <CardContent className="p-10 text-center">
                    <Icon name="event_available" size={40} className="text-success mx-auto mb-3" />
                    <p className="text-title-sm font-bold">{_('No late submissions')}</p>
                    <p className="text-label-sm text-muted-foreground mt-1">{_('All assignments are on track. Great job!')}</p>
                  </CardContent>
                </Card>
              ) : (
                d.lateSubmissions.map((item, idx) => {
                  const overdueDays = Math.max(0, Math.floor((Date.now() - new Date(item.assignment.dueDate!).getTime()) / 86400000));
                  return (
                    <div key={item.assignment.id}>
                      <Card className="border-border/60">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="h-11 w-11 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                                <Icon name="warning" size={20} className="text-destructive" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-title-sm font-bold">{item.assignment.title}</p>
                                <p className="text-label-sm text-muted-foreground truncate">
                                  {item.subjectName}
                                </p>
                              </div>
                            </div>
                            <Badge variant="destructive">{overdueDays} {_('days overdue')}</Badge>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                            <div className="p-3 rounded-lg bg-muted/50 text-center">
                              <p className="text-display-xs font-bold">{item.assignment.dueDate ? formatDateTime(item.assignment.dueDate, 'MMM d, yyyy') : '—'}</p>
                              <p className="text-label-xs text-muted-foreground">{_('Due date')}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-success-container/30 text-center">
                              <p className="text-display-xs font-bold text-success">{item.submittedCount}</p>
                              <p className="text-label-xs text-muted-foreground">{_('Submitted')}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-primary-container/30 text-center">
                              <p className="text-display-xs font-bold text-primary">{item.gradedCount}</p>
                              <p className="text-label-xs text-muted-foreground">{_('Graded')}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-warning-container/30 text-center">
                              <p className="text-display-xs font-bold text-warning">{item.submissionCount}</p>
                              <p className="text-label-xs text-muted-foreground">{_('Total submissions')}</p>
                            </div>
                          </div>

                          <div className="mt-4">
                            <Button asChild size="sm" variant="outline">
                              <Link to={ROUTES.TEACHER_AWAITING_GRADING}>
                                <Icon name="visibility" size={14} className="mr-1" /> {_('Review submissions')}
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </DataFetchWrapper>
      </div>
    </>
  );
}