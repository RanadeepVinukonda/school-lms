import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Link } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/services/api';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { ROUTES } from '@/lib/constants';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { useTeacherReviewData } from '@/hooks/useTeacherReviewData';

interface GradeForm {
  score: string;
  feedback: string;
}

export default function TeacherAwaitingGradingPage() {
  const { _ } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useTeacherReviewData();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [forms, setForms] = useState<Record<string, GradeForm>>({});
  const gradeMutation = useMutation({
    mutationFn: async (vars: { assignmentId: string; submissionId: string; score: number; feedback?: string; totalPoints: number }) => {
      const res = await api.put(
        `/assignments/${vars.assignmentId}/submissions/${vars.submissionId}/grade`,
        { score: vars.score, totalPoints: vars.totalPoints, feedback: vars.feedback || undefined },
      );
      return res.data;
    },
    onSuccess: () => {
      toast.success(_('Submission graded'));
      queryClient.invalidateQueries({ queryKey: ['teacher-review-data'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || _('Failed to grade submission'));
    },
  });

  function getForm(submissionId: string): GradeForm {
    return forms[submissionId] ?? { score: '', feedback: '' };
  }

  function submitGrade(submissionId: string, assignmentId: string, totalPoints: number) {
    const form = getForm(submissionId);
    const score = Number(form.score);
    if (form.score === '' || Number.isNaN(score) || score < 0) {
      toast.error(_('Enter a valid score'));
      return;
    }
    gradeMutation.mutate({ assignmentId, submissionId, score, feedback: form.feedback, totalPoints });
    setForms((prev) => ({ ...prev, [submissionId]: { score: '', feedback: '' } }));
  }

  return (
    <>
      <SEOHead title={_('Awaiting Grading')} description={_('Review and grade student assignment submissions')} canonical="/teacher/awaiting-grading" />
      <div

        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32"
      >
        <div className="mb-6 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon-sm">
            <Link to={ROUTES.TEACHER_DASHBOARD}><Icon name="arrow_back" size={20} /></Link>
          </Button>
          <div>
            <h1 className="text-headline-md md:text-headline-lg font-bold tracking-tight">{_('Awaiting Grading')}</h1>
            <p className="text-body-md text-muted-foreground mt-1">{_('Assignments submitted by students, waiting for your marks')}</p>
          </div>
        </div>

        <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="card">
          {(d) => (
            <div className="space-y-4">
              {d.awaitingGrading.length === 0 ? (
                <Card className="border-border/60">
                  <CardContent className="p-10 text-center">
                    <Icon name="task_alt" size={40} className="text-success mx-auto mb-3" />
                    <p className="text-title-sm font-bold">{_('Nothing to grade')}</p>
                    <p className="text-label-sm text-muted-foreground mt-1">{_('All submissions have been marked. Nice work!')}</p>
                  </CardContent>
                </Card>
              ) : (
                d.awaitingGrading.map((item, idx) => {
                  const sub = item.submission;
                  const totalPoints = item.assignment.points ?? 10;
                  const isExpanded = expanded[sub.id];
                  return (
                    <div key={sub.id}>
                      <Card className="border-border/60">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="h-11 w-11 rounded-xl bg-warning-container flex items-center justify-center shrink-0">
                                <Icon name="rate_review" size={20} className="text-warning" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-title-sm font-bold">{item.studentName}</p>
                                <p className="text-label-sm text-muted-foreground truncate">{item.assignment.title}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="warning">{_('Submitted')}</Badge>
                              <span className="text-label-xs text-muted-foreground">{sub.submittedAt ? formatRelativeTime(sub.submittedAt) : '—'}</span>
                            </div>
                          </div>

                          {sub.content && (
                            <div className="mt-4 p-3 rounded-xl bg-muted/50">
                              <p className="text-label-xs text-muted-foreground mb-1">{_('Student notes:')}</p>
                              <p className="text-body-md whitespace-pre-wrap break-words">{sub.content}</p>
                            </div>
                          )}

                          {!isExpanded ? (
                            <div className="mt-4 flex items-center gap-3 flex-wrap">
                              <Button size="sm" variant="outline" onClick={() => setExpanded((prev) => ({ ...prev, [sub.id]: true }))}>
                                <Icon name="edit_note" size={14} className="mr-1" /> {_('Grade')}
                              </Button>
                              <span className="text-label-xs text-muted-foreground">/ {_('Total')} {totalPoints} {_('points')}</span>
                            </div>
                          ) : (
                            <div className="mt-4 p-4 rounded-xl border border-border/60 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                <div className="space-y-1.5">
                                  <label className="text-label-xs text-muted-foreground">{_('Score')}</label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={totalPoints}
                                    placeholder={`${_('out of')} ${totalPoints}`}
                                  value={getForm(sub.id).score}
                                  onChange={(e) => setForms((prev) => ({ ...prev, [sub.id]: { ...getForm(sub.id), score: e.target.value } }))}
                                  />
                                </div>
                                <div className="sm:col-span-1 space-y-1.5">
                                  <label className="text-label-xs text-muted-foreground">{_('Feedback')} ({_('optional')})</label>
                                  <Input
                                    placeholder={_('Add feedback...')}
                                  value={getForm(sub.id).feedback}
                                  onChange={(e) => setForms((prev) => ({ ...prev, [sub.id]: { ...getForm(sub.id), feedback: e.target.value } }))}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    loading={gradeMutation.isPending && gradeMutation.variables?.submissionId === sub.id}
                                    onClick={() => submitGrade(sub.id, item.assignment.id, totalPoints)}
                                  >
                                    <Icon name="check" size={14} className="mr-1" /> {_('Submit grade')}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setExpanded((prev) => ({ ...prev, [sub.id]: false }))}>
                                    {_('Cancel')}
                                  </Button>
                                </div>
                              </div>
                              <p className="text-label-xs text-muted-foreground">
                                {_('Submitted')} {sub.submittedAt ? formatDateTime(sub.submittedAt) : '—'}
                              </p>
                            </div>
                          )}
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
