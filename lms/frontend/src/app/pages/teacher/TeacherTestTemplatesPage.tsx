import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { scrollReveal, cardStackReveal } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

interface CompiledQuestion {
  id: string; questionText: string; type: string; difficulty: string; points: number; options?: string[];
}

const QUESTION_MODELS = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'fill_blank', label: 'Fill in Blank' },
  { value: 'matching', label: 'Matching' },
  { value: 'essay', label: 'Essay' },
];

export default function TeacherTestTemplatesPage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  const [previewTitle, setPreviewTitle] = useState('');

  function handleEditPreviewQuestion(index: number, field: string, value: any) {
    setPreviewQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function handleEditPreviewOption(index: number, optionIndex: number, value: string) {
    setPreviewQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[index] };
      const opts = [...(q.options || [])];
      opts[optionIndex] = value;
      q.options = opts;
      next[index] = q;
      return next;
    });
  }

  function handleDeletePreviewQuestion(index: number) {
    setPreviewQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleMovePreviewQuestion(index: number, direction: 'up' | 'down') {
    setPreviewQuestions((prev) => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  const [compilingId, setCompilingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [textbookId, setTextbookId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [passingScore, setPassingScore] = useState(50);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [shuffle, setShuffle] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>(['multiple_choice', 'true_false']);
  const [questionCount, setQuestionCount] = useState(10);
  const [easyCount, setEasyCount] = useState(3);
  const [mediumCount, setMediumCount] = useState(5);
  const [hardCount, setHardCount] = useState(2);

  useEffect(() => {
    const qClassId = searchParams.get('classId');
    const qSubjectId = searchParams.get('subjectId');
    const qTextbookId = searchParams.get('textbookId');
    const qChapterId = searchParams.get('chapterId');
    const qConceptId = searchParams.get('conceptId');
    if (qClassId && qSubjectId) {
      setClassId(qClassId);
      setSubjectId(qSubjectId);
      if (qTextbookId) setTextbookId(qTextbookId);
      if (qChapterId) setChapterId(qChapterId);
      setTitle(`${_('Test')} - ${qConceptId ? `${_('Concept')} ${qConceptId.slice(0, 8)}` : _('Untitled')}`);
      setShowCreate(true);
    }
  }, [searchParams]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['test-templates', user?.id],
    queryFn: () => api.get('/test-templates', { params: { createdBy: user?.id } }).then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const { data: myAssignments } = useQuery({
    queryKey: ['teacher-my-assignments', user?.id],
    queryFn: () => api.get('/teacher-class-subject/my').then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const classOptions = myAssignments
    ? [...new Map(myAssignments.map((a: any) => [a.classId, { id: a.classId, name: a.className || a.classId }])).values()]
    : [];

  const subjectOptions = myAssignments
    ?.filter((a: any) => a.classId === classId)
    .map((a: any) => ({ id: a.subjectId, name: a.subjectName || a.subjectId })) ?? [];

  const { data: textbooks } = useQuery({
    queryKey: ['textbooks-by-subject', subjectId, classId],
    queryFn: () => (subjectId && classId) ? api.get(`/textbooks/by-class/${classId}/subject/${subjectId}`).then((r) => r.data.data) : Promise.resolve([]),
    enabled: !!subjectId && !!classId,
  });

  const { data: chapters } = useQuery({
    queryKey: ['chapters-by-textbook', textbookId],
    queryFn: () => textbookId ? api.get(`/textbooks/${textbookId}/chapters`).then((r) => r.data.data) : Promise.resolve([]),
    enabled: !!textbookId,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/test-templates', {
      title, description: description || undefined,
      classId, subjectId,
      source: 'question_bank',
      config: { timeLimitMinutes: timeLimit, passingScore, maxAttempts, shuffleQuestions: shuffle, showResults },
      selectionConfig: { selectedModels, questionCount, difficultyDistribution: { easy: easyCount, medium: mediumCount, hard: hardCount }, textbookId: textbookId || undefined, chapterId: chapterId || undefined, conceptId: searchParams.get('conceptId') || undefined },
    }),
    onSuccess: (r) => {
      toast.success(_('Template created'));
      setShowCreate(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['test-templates'] });
    },
    onError: () => toast.error(_('Failed to create template')),
  });

  const compileMutation = useMutation({
    mutationFn: ({ id, textbookId, chapterId, conceptId }: { id: string; textbookId?: string; chapterId?: string; conceptId?: string }) =>
      api.post(`/test-templates/${id}/compile`, { textbookId, chapterId, conceptId }).then((r) => r.data.data),
    onSuccess: (data) => {
      setPreviewQuestions(data.questions ?? []);
      setPreviewTitle(data.title || _('Compiled Paper'));
      setShowPreview(true);
    },
    onError: (err: any) => toast.error(err.message || _('Failed to compile')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/test-templates/${id}`),
    onSuccess: () => { toast.success(_('Template deleted')); queryClient.invalidateQueries({ queryKey: ['test-templates'] }); },
  });

  function resetForm() {
    setTitle(''); setDescription(''); setClassId(''); setSubjectId(''); setTextbookId(''); setChapterId('');
    setTimeLimit(30); setPassingScore(50); setMaxAttempts(1); setShuffle(true); setShowResults(false);
    setSelectedModels(['multiple_choice', 'true_false']); setQuestionCount(10);
    setEasyCount(3); setMediumCount(5); setHardCount(2);
  }

  const toggleModel = (val: string) => {
    setSelectedModels((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);
  };

  const templates: any[] = Array.isArray(data) ? data : data?.items ?? [];

  return (
    <>
      <SEOHead title={_('Test Templates')} description={_('Create reusable test templates')} canonical="/teacher/test-templates" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sm:p-6 p-4 max-w-6xl mx-auto space-y-16 pb-32">
        <motion.div variants={cardStackReveal} custom={0} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-headline-sm">{_('Test Templates')}</h1>
          </div>
          <Button onClick={() => setShowCreate(true)}><Icon name="add" size={16} className="mr-1" />{_('New Template')}</Button>
        </motion.div>

        <motion.div variants={cardStackReveal} custom={0}>
          <DataFetchWrapper data={templates} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="list">
            {() => (
              <div className="space-y-2">
                {templates.length === 0 ? (
                  <Card className="border-border/60"><CardContent className="p-8 text-center text-muted-foreground"><Icon name="description" size={48} className="mx-auto mb-3 opacity-40" /><p>{_('No templates yet.')}</p></CardContent></Card>
                ) : (
                  templates.map((t: any) => (
                    <Card key={t.id} className="border-border/60">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{t.title}</h3>
                              <Badge variant={t.status === 'active' ? 'default' : t.status === 'archived' ? 'secondary' : 'outline'} className="text-xs">{t.status}</Badge>
                            </div>
                            {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span>{t.config?.timeLimitMinutes} {_('min')}</span>
                              <span>{_('Pass')}: {t.config?.passingScore}%</span>
                              <span>{_('Max')}: {t.config?.maxAttempts} {_('attempts')}</span>
                              <span>{t.config?.shuffleQuestions ? _('Shuffled') : _('Ordered')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => {
                              setCompilingId(t.id);
                              compileMutation.mutate({ id: t.id, textbookId: t.selectionConfig?.textbookId, chapterId: t.selectionConfig?.chapterId, conceptId: t.selectionConfig?.conceptId });
                            }} disabled={compileMutation.isPending}>
                              <Icon name="visibility" size={14} className="mr-1" />{_('Preview')}
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => { if (confirm(_('Delete this template?'))) deleteMutation.mutate(t.id); }}><Icon name="delete" size={16} /></Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </DataFetchWrapper>
        </motion.div>

        <Dialog open={showCreate} onOpenChange={(o) => { if (!o) resetForm(); setShowCreate(o); }}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{_('Create Test Template')}</DialogTitle>
              <DialogDescription>{_('Configure question selection and exam settings.')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={_('Template title')} />
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={_('Description (optional)')} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">{_('Class')}</label>
                  <select value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(''); setTextbookId(''); setChapterId(''); }} className="w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground mt-1">
                    <option value="">{_('Select class...')}</option>
                    {classOptions.map((c: any) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">{_('Subject')}</label>
                  <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTextbookId(''); setChapterId(''); }} disabled={!classId} className="w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground mt-1">
                    <option value="">{_('Select subject...')}</option>
                    {subjectOptions.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">{_('Textbook (optional)')}</label>
                  <select value={textbookId} onChange={(e) => { setTextbookId(e.target.value); setChapterId(''); }} disabled={!subjectId} className="w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground mt-1">
                    <option value="">{_('All textbooks')}</option>
                    {(textbooks ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">{_('Chapter (optional)')}</label>
                  <select value={chapterId} onChange={(e) => setChapterId(e.target.value)} disabled={!textbookId} className="w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground mt-1">
                    <option value="">{_('All chapters')}</option>
                    {(chapters ?? []).map((ch: any) => <option key={ch.id} value={ch.id}>{_('Chapter')} {ch.order}: {ch.title}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">{_('Time Limit (min)')}</label><Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} min={1} /></div>
                <div><label className="text-sm font-medium">{_('Passing Score (%)')}</label><Input type="number" value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} min={0} max={100} /></div>
                <div><label className="text-sm font-medium">{_('Max Attempts')}</label><Input type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} min={1} /></div>
                <div><label className="text-sm font-medium">{_('Question Count')}</label><Input type="number" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} min={1} /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div><label className="text-sm font-medium">{_('Easy')}</label><Input type="number" value={easyCount} onChange={(e) => setEasyCount(Number(e.target.value))} min={0} /></div>
                <div><label className="text-sm font-medium">{_('Medium')}</label><Input type="number" value={mediumCount} onChange={(e) => setMediumCount(Number(e.target.value))} min={0} /></div>
                <div><label className="text-sm font-medium">{_('Hard')}</label><Input type="number" value={hardCount} onChange={(e) => setHardCount(Number(e.target.value))} min={0} /></div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
                  {_('Shuffle questions')}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={showResults} onChange={(e) => setShowResults(e.target.checked)} />
                  {_('Show results immediately')}
                </label>
              </div>

              <div>
                <label className="text-sm font-medium">{_('Question Types')}</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {QUESTION_MODELS.map((m) => (
                    <Button key={m.value} variant={selectedModels.includes(m.value) ? 'default' : 'outline'} size="sm" onClick={() => toggleModel(m.value)}>{_(m.label)}</Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetForm(); setShowCreate(false); }}>{_('Cancel')}</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || !classId || !subjectId || createMutation.isPending}>{_('Create Template')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{_('Paper Preview')}: {previewTitle}</DialogTitle>
              <DialogDescription>{_('Review the compiled question paper before scheduling.')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {previewQuestions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{_('No questions matched the criteria. Adjust your template settings.')}</p>
              ) : (
                previewQuestions.map((q: any, i: number) => (
                  <Card key={q.id || i} className="border-border/60">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleMovePreviewQuestion(i, 'up')} disabled={i === 0} className="h-5 w-5 p-0">
                            <Icon name="arrow_upward" size={12} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleMovePreviewQuestion(i, 'down')} disabled={i === previewQuestions.length - 1} className="h-5 w-5 p-0">
                            <Icon name="arrow_downward" size={12} />
                          </Button>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeletePreviewQuestion(i)} className="h-5 w-5 p-0 text-destructive">
                          <Icon name="delete" size={12} />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <select
                          value={q.type || 'multiple_choice'}
                          onChange={(e) => handleEditPreviewQuestion(i, 'type', e.target.value)}
                          className="rounded border border-border bg-background px-2 py-1 text-[10px]"
                        >
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="true_false">True / False</option>
                          <option value="short_answer">Short Answer</option>
                          <option value="fill_blank">Fill Blank</option>
                        </select>

                        <select
                          value={q.difficulty || 'medium'}
                          onChange={(e) => handleEditPreviewQuestion(i, 'difficulty', e.target.value)}
                          className="rounded border border-border bg-background px-2 py-1 text-[10px]"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>

                        <Input
                          type="number"
                          min={1}
                          value={q.points ?? 1}
                          onChange={(e) => handleEditPreviewQuestion(i, 'points', parseInt(e.target.value) || 1)}
                          className="h-7 text-[10px]"
                          placeholder={_('Points')}
                        />
                      </div>

                      <Input
                        value={q.questionText || q.text || ''}
                        onChange={(e) => handleEditPreviewQuestion(i, 'questionText', e.target.value)}
                        className="text-xs"
                        placeholder={_('Question text...')}
                      />

                      {(q.type === 'multiple_choice' || q.type === 'mcq') && q.options && Array.isArray(q.options) && (
                        <div className="space-y-1">
                          {q.options.map((opt: string, oi: number) => (
                            <div key={oi} className="flex items-center gap-1">
                              <span className="text-[10px] font-mono text-muted-foreground w-4">{String.fromCharCode(65 + oi)}.</span>
                              <Input
                                value={opt || ''}
                                onChange={(e) => handleEditPreviewOption(i, oi, e.target.value)}
                                className="h-7 text-[10px] flex-1"
                                placeholder={`${_('Option')} ${String.fromCharCode(65 + oi)}`}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {(q.type === 'true_false') && (
                        <select
                          value={q.correctAnswer || ''}
                          onChange={(e) => handleEditPreviewQuestion(i, 'correctAnswer', e.target.value)}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                        >
                          <option value="">{_('Select correct answer...')}</option>
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      )}

                      {(q.type === 'short_answer' || q.type === 'fill_blank') && (
                        <Input
                          value={q.correctAnswer || ''}
                          onChange={(e) => handleEditPreviewQuestion(i, 'correctAnswer', e.target.value)}
                          className="h-7 text-xs"
                          placeholder={_('Correct answer...')}
                        />
                      )}

                      {(q.type === 'multiple_choice' || q.type === 'mcq') && (
                        <Input
                          value={q.correctAnswer || ''}
                          onChange={(e) => handleEditPreviewQuestion(i, 'correctAnswer', e.target.value)}
                          className="h-7 text-xs"
                          placeholder={_('Correct answer (A, B, C, or D)...')}
                        />
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <Button variant="outline" onClick={() => setShowPreview(false)}>{_('Close')}</Button>
              <Button onClick={() => { setShowPreview(false); navigate(`/teacher/test-schedule?templateId=${compilingId}`); }} disabled={!compilingId}>
                <Icon name="calendar_month" size={16} className="mr-1" />{_('Schedule to Class')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </>
  );
}
