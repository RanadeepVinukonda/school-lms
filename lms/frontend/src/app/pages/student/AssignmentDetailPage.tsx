import { useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { sanitizeHtml } from '@/lib/sanitize';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Icon } from '@/components/ui/Icon';
import { getAssignment, getSubmissionsByAssignment, getSubject } from '@/services/dataService';
import { getTextbook } from '@/services/textbookService';
import { formatDate, formatDateTime } from '@/lib/format';
import type { Submission } from '@/types';
import api from '@/services/api';

const submitSchema = z.object({
  notes: z.string().max(500, 'Notes must be under 500 characters').optional(),
});



const STATUS = {
  published: { variant: 'warning' as const, label: 'Open' },
  draft: { variant: 'secondary' as const, label: 'Draft' },
  closed: { variant: 'outline' as const, label: 'Closed' },
  graded: { variant: 'success' as const, label: 'Graded' },
};

export default function AssignmentDetailPage() {
  const { _ } = useTranslation();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const user = useAuthStore((s) => s.user);
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const queryClient = useQueryClient();

  const { register, handleSubmit, watch, formState: { errors } } = useForm({ resolver: zodResolver(submitSchema) });
  const notes = watch('notes');

  const { data: assignment, isLoading, error, refetch } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: async () => {
      if (!assignmentId) return null;
      return getAssignment(assignmentId);
    },
    enabled: !!assignmentId,
  });

  const { data: textbook } = useQuery({
    queryKey: ['textbook', assignment?.textbookId],
    queryFn: async () => {
      if (!assignment?.textbookId) return null;
      return getTextbook(assignment.textbookId);
    },
    enabled: !!assignment?.textbookId,
  });

  const { data: subject } = useQuery({
    queryKey: ['subject', textbook?.subjectId],
    queryFn: async () => {
      if (!textbook?.subjectId) return null;
      return getSubject(textbook.subjectId);
    },
    enabled: !!textbook?.subjectId,
  });

  const { data: submissions } = useQuery({
    queryKey: ['submissions', assignmentId, user?.id],
    queryFn: async (): Promise<(Submission & { userId: string; studentName: string; attachments: string[]; attemptNumber: number })[] | null> => {
      if (!assignmentId || !user?.id) return null;
      const all = await getSubmissionsByAssignment(assignmentId);
      const filtered = all.filter((s) => s.studentId === user.id);
      if (filtered.length === 0) return null;
      return filtered.map((s) => ({
        id: s.id,
        assignmentId: s.assignmentId,
        userId: s.studentId,
        studentName: user?.displayName || '',
        content: s.content ?? '',
        attachments: [] as string[],
        status: (s.status as Submission['status']) ?? 'submitted',
        attemptNumber: 1,
        submittedAt: s.submittedAt ?? new Date().toISOString(),
        feedback: s.feedback,
        grade: typeof s.grade === 'number' ? {
          id: `g-${s.id}`,
          submissionId: s.id,
          score: s.grade,
          totalPoints: assignment?.points ?? 0,
          percentage: assignment?.points ? Math.round((s.grade / assignment.points) * 100) : 0,
          letter: 'B' as const,
          feedback: s.feedback || '',
          gradedBy: '',
          gradedAt: s.submittedAt ?? '',
        } : undefined,
      }));
    },
    enabled: !!assignmentId && !!user?.id,
  });

  const sub = submissions?.[0] ?? null;
  const history = submissions?.slice(0) ?? [];

  const { isPending, mutate } = useMutation({
    mutationFn: async () => {
      await api.post(`/assignments/${assignmentId}/submit`, {
        content: notes || '',
        attachments: file ? [file] : [],
      });
    },
    onSuccess: () => {
      toast.success(_('Assignment submitted!'));
      setConfirm(false);
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ['submissions', assignmentId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['student-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['parent-child-detail'] });
    },
    onError: (err: any) => {
      toast.error(err.message || _('Failed to submit. Try again.'));
    },
  });

  const rem = (due: string) => {
    const h = Math.floor((new Date(due).getTime() - Date.now()) / 3600000);
    if (h < 0) return { label: _('Overdue'), variant: 'destructive' as const };
    if (h < 1) return { label: _('Due soon'), variant: 'destructive' as const };
    if (h < 24) return { label: `${h}h ${_('remaining')}`, variant: 'warning' as const };
    return { label: `${Math.floor(h / 24)}d ${h % 24}h ${_('remaining')}`, variant: 'secondary' as const };
  };

  const subInfo = (s: Submission | null, overdue: boolean): { label: string; variant: 'success' | 'destructive' | 'warning' } => {
    if (s?.status === 'graded') return { label: _('Graded'), variant: 'success' };
    if (s?.status === 'submitted') return { label: _('Submitted'), variant: 'success' };
    if (s?.status === 'late') return { label: _('Late'), variant: 'destructive' };
    return { label: _('Not Submitted'), variant: overdue ? 'destructive' : 'warning' };
  };

  const assignmentFiles = []; // populated from API when available

  const formatRelativeTime = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return _('just now');
    if (m < 60) return `${m}m ${_('ago')}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ${_('ago')}`;
    const days = Math.floor(h / 24);
    return days < 7 ? `${d}d ${_('ago')}` : formatDate(d);
  };

  return (
    <>
      <SEOHead title={assignment?.title || _('Assignment')} description={_('Assignment') + ': ' + (assignment?.title || '')} canonical={`/assignments/${assignmentId}`} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <Button variant="ghost" size="sm" asChild className="mb-1">
          <Link to="/student/dashboard"><Icon name="arrow_back" size={18} className="mr-1" />{_('Back')}</Link>
        </Button>

        <DataFetchWrapper
          data={assignment ?? null}
          isLoading={isLoading}
          error={error as Error}
          loadingType="detail"
          emptyMessage={_('Assignment not found')}
          onRetry={() => refetch()}
        >
          {(asgn) => {
            const a = asgn as NonNullable<typeof assignment>;
            const tb = textbook ?? null;
            const sbj = subject ?? null;
            const late = a.dueDate ? new Date(a.dueDate).getTime() < Date.now() : false;
            const r = a.dueDate ? rem(a.dueDate) : { label: _('No due date'), variant: 'secondary' as const };
            const s = STATUS[(a.status as keyof typeof STATUS) || 'published'] || STATUS.published;
            const si = subInfo(sub, late);

            return (
              <>
                <motion.div variants={cardStackReveal} custom={0}>
                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-title-md">{a.title}</CardTitle>
                            <Badge variant={r.variant}>{r.label}</Badge>
                          </div>
                          {sbj && <p className="flex items-center gap-1 mt-2 text-body-md text-muted-foreground"><Icon name="book" size={16} />{sbj.name}{tb && <span className="text-label-xs ml-2 opacity-70">{tb.title}</span>}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <Badge variant={s.variant}>{s.label}</Badge>
                          <Badge variant={si.variant}>{si.label}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4 text-body-md flex-wrap">
                        <span className="flex items-center gap-1"><Icon name="calendar_today" size={16} className="text-muted-foreground" />{_('Due')} {a.dueDate ? formatDate(a.dueDate) : 'N/A'}</span>
                        <span className="flex items-center gap-1"><Icon name="award_star" size={16} className="text-muted-foreground" />{a.points} {_('pts')}</span>
                        <span className="flex items-center gap-1"><Icon name="schedule" size={16} className="text-muted-foreground" />{r.label}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardStackReveal} custom={0}>
                  <Card className="border-border/60">
                    <CardHeader className="pb-2"><CardTitle className="text-title-sm flex items-center gap-2"><Icon name="description" size={20} />{_('Instructions')}</CardTitle></CardHeader>
                    <CardContent className="p-5">
                      <div className="text-body-md prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.description || '') }} />
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardStackReveal} custom={0}>
                  <Card className="border-border/60">
                    <CardHeader className="pb-2"><CardTitle className="text-title-sm flex items-center gap-2"><Icon name="attachment" size={20} />{_('Resources')}</CardTitle></CardHeader>
                    <CardContent className="p-5 space-y-2">
                      {assignmentFiles.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Icon name="folder_open" size={32} className="mx-auto mb-2 opacity-50" />
                          <p className="text-body-md">{_('No resources attached')}</p>
                        </div>
                      ) : (
                        assignmentFiles.map((f) => (
                          <div key={f} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Icon name="description" size={18} className="text-primary" /></div>
                              <span className="text-body-md font-medium truncate">{f}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="shrink-0"><Icon name="download" size={18} /></Button>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardStackReveal} custom={0}>
                  <Card className="border-border/60">
                    <CardHeader className="pb-2"><CardTitle className="text-title-sm flex items-center gap-2"><Icon name="school" size={20} />{_('Teacher Notes')}</CardTitle></CardHeader>
                    <CardContent className="p-5">
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-body-md italic leading-relaxed text-muted-foreground">&ldquo;{_('Follow the instructions and submit before the deadline. Good luck!')}&rdquo;</p>
                        <p className="text-label-xs text-muted-foreground/60 mt-2">&mdash; {_('Your Teacher')}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardStackReveal} custom={0}>
                  <Card className="border-border/60">
                    <CardHeader className="pb-2"><CardTitle className="text-title-sm flex items-center gap-2"><Icon name="upload_file" size={20} />{sub ? _('Your Submission') : _('Submit Assignment')}</CardTitle></CardHeader>
                    <CardContent className="p-5">
                      {sub ? (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-success/5 border border-success/20">
                            <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center"><Icon name="check_circle" size={28} className="text-success" /></div>
                            <div><p className="font-medium text-body-md">{sub.status === 'graded' ? _('Graded') : _('Submitted')}</p><p className="text-label-xs text-muted-foreground">{_('Submitted')} {formatDateTime(sub.submittedAt)}</p></div>
                            <Badge variant={si.variant} className="ml-auto">{si.label}</Badge>
                          </div>
                          {sub.content && <div className="p-3 rounded-xl bg-muted/50"><p className="text-label-xs text-muted-foreground mb-1">{_('Your notes:')}</p><p className="text-body-md">{sub.content}</p></div>}
                          {sub.grade && (
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-title-sm font-medium">{_('Grade')}</span>
                                <span className="text-display-xs font-bold text-primary">{sub.grade.score}<span className="text-body-md font-normal text-muted-foreground">/{a.points}</span></span>
                              </div>
                              {sub.grade.feedback && <><Separator className="my-2" /><p className="text-label-xs text-muted-foreground mb-1">{_('Feedback:')}</p><p className="text-body-md italic">{sub.grade.feedback}</p></>}
                            </div>
                          )}
                        </div>
                      ) : (
                        <form onSubmit={handleSubmit(() => setConfirm(true))} className="space-y-4">
                          <div
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${drag ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
                            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                            onDragLeave={() => setDrag(false)}
                            onDrop={(e) => { e.preventDefault(); setDrag(false); setFile(e.dataTransfer.files[0]?.name || null); }}
                            onClick={() => fileRef.current?.click()}
                          >
                            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.txt,.png,.jpg" onChange={(e) => setFile(e.target.files?.[0]?.name || null)} />
                            {file ? (
                              <div className="flex items-center justify-center gap-2">
                                <Icon name="description" size={24} className="text-primary" />
                                <span className="text-body-md font-medium">{file}</span>
                                <Button type="button" variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setFile(null); }}><Icon name="close" size={16} /></Button>
                              </div>
                            ) : (
                              <><Icon name="upload_file" size={36} className="mx-auto mb-2 text-muted-foreground/60" /><p className="text-body-md font-medium">{_('Drop files here or click to upload')}</p><p className="text-label-xs text-muted-foreground mt-1">{_('PDF, DOC, TXT, PNG up to 10MB')}</p></>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-body-md font-medium">{_('Additional Notes')}</label>
                            <Textarea placeholder={_('Add any notes or comments about your submission...')} rows={3} {...register('notes')} error={errors.notes?.message as string} />
                          </div>
                          <Button type="submit" className="w-full" size="lg" disabled={isPending}>
                            {isPending ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />{_('Submitting...')}</> : <><Icon name="upload_file" size={18} className="mr-2" />{_('Submit Assignment')}</>}
                          </Button>
                        </form>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {history.length > 1 && (
                  <motion.div variants={cardStackReveal} custom={0}>
                    <Card className="border-border/60">
                      <CardHeader className="pb-2"><CardTitle className="text-title-sm flex items-center gap-2"><Icon name="history" size={20} />{_('Version History')}</CardTitle><CardDescription>{history.length} {_('submission(s)')}</CardDescription></CardHeader>
                      <CardContent className="p-5 space-y-2">
                        {history.map((h, i) => (
                          <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Icon name="description" size={16} className="text-primary" /></div>
                            <div className="flex-1 min-w-0"><p className="text-body-md font-medium">{_('Version')} {history.length - i}</p><p className="text-label-xs text-muted-foreground">{_('Submitted')} {formatRelativeTime(h.submittedAt)}</p></div>
                            <Badge variant={h.status === 'graded' ? 'success' : h.status === 'late' ? 'destructive' : 'secondary'}>{h.status}</Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {confirm && (
                  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-sm border-border/60">
                      <CardHeader><CardTitle className="text-title-sm">{_('Confirm Submission')}</CardTitle><CardDescription>{_('Are you sure you want to submit? You can resubmit before the deadline if needed.')}</CardDescription></CardHeader>
                      <CardContent className="p-5 flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setConfirm(false)}>{_('Cancel')}</Button>
                        <Button className="flex-1" onClick={() => mutate()}>{_('Confirm & Submit')}</Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            );
          }}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
