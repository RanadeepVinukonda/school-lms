import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState<CompiledQuestion[]>([]);
  const [previewTitle, setPreviewTitle] = useState('');
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
      setTitle(`Test - ${qConceptId ? `Concept ${qConceptId.slice(0, 8)}` : 'Untitled'}`);
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
      toast.success('Template created');
      setShowCreate(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['test-templates'] });
    },
    onError: () => toast.error('Failed to create template'),
  });

  const compileMutation = useMutation({
    mutationFn: ({ id, textbookId, chapterId, conceptId }: { id: string; textbookId?: string; chapterId?: string; conceptId?: string }) =>
      api.post(`/test-templates/${id}/compile`, { textbookId, chapterId, conceptId }).then((r) => r.data.data),
    onSuccess: (data) => {
      setPreviewQuestions(data.questions ?? []);
      setPreviewTitle(data.title || 'Compiled Paper');
      setShowPreview(true);
    },
    onError: (err: any) => toast.error(err.message || 'Failed to compile'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/test-templates/${id}`),
    onSuccess: () => { toast.success('Template deleted'); queryClient.invalidateQueries({ queryKey: ['test-templates'] }); },
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
      <SEOHead title="Test Templates" description="Create reusable test templates" canonical="/teacher/test-templates" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 max-w-6xl mx-auto space-y-16 pb-32">
        <motion.div variants={cardStackReveal} custom={0} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-headline-sm">Test Templates</h1>
          </div>
          <Button onClick={() => setShowCreate(true)}><Icon name="add" size={16} className="mr-1" />New Template</Button>
        </motion.div>

        <motion.div variants={cardStackReveal} custom={0}>
          <DataFetchWrapper data={templates} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="list">
            {() => (
              <div className="space-y-2">
                {templates.length === 0 ? (
                  <Card className="border-border/60"><CardContent className="p-8 text-center text-muted-foreground"><Icon name="description" size={48} className="mx-auto mb-3 opacity-40" /><p>No templates yet.</p></CardContent></Card>
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
                              <span>{t.config?.timeLimitMinutes} min</span>
                              <span>Pass: {t.config?.passingScore}%</span>
                              <span>Max: {t.config?.maxAttempts} attempts</span>
                              <span>{t.config?.shuffleQuestions ? 'Shuffled' : 'Ordered'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => {
                              setCompilingId(t.id);
                              compileMutation.mutate({ id: t.id, textbookId: t.selectionConfig?.textbookId, chapterId: t.selectionConfig?.chapterId, conceptId: t.selectionConfig?.conceptId });
                            }} disabled={compileMutation.isPending}>
                              <Icon name="visibility" size={14} className="mr-1" />Preview
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => { if (confirm('Delete this template?')) deleteMutation.mutate(t.id); }}><Icon name="delete" size={16} /></Button>
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
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Test Template</DialogTitle>
              <DialogDescription>Configure question selection and exam settings.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Template title" />
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Class</label>
                  <select value={classId} onChange={(e) => { setClassId(e.target.value); setSubjectId(''); setTextbookId(''); setChapterId(''); }} className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1">
                    <option value="">Select class...</option>
                    {classOptions.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTextbookId(''); setChapterId(''); }} disabled={!classId} className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1">
                    <option value="">Select subject...</option>
                    {subjectOptions.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Textbook (optional)</label>
                  <select value={textbookId} onChange={(e) => { setTextbookId(e.target.value); setChapterId(''); }} disabled={!subjectId} className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1">
                    <option value="">All textbooks</option>
                    {(textbooks ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Chapter (optional)</label>
                  <select value={chapterId} onChange={(e) => setChapterId(e.target.value)} disabled={!textbookId} className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1">
                    <option value="">All chapters</option>
                    {(chapters ?? []).map((ch: any) => <option key={ch.id} value={ch.id}>Chapter {ch.order}: {ch.title}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Time Limit (min)</label><Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} min={1} /></div>
                <div><label className="text-sm font-medium">Passing Score (%)</label><Input type="number" value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} min={0} max={100} /></div>
                <div><label className="text-sm font-medium">Max Attempts</label><Input type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} min={1} /></div>
                <div><label className="text-sm font-medium">Question Count</label><Input type="number" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} min={1} /></div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-sm font-medium">Easy</label><Input type="number" value={easyCount} onChange={(e) => setEasyCount(Number(e.target.value))} min={0} /></div>
                <div><label className="text-sm font-medium">Medium</label><Input type="number" value={mediumCount} onChange={(e) => setMediumCount(Number(e.target.value))} min={0} /></div>
                <div><label className="text-sm font-medium">Hard</label><Input type="number" value={hardCount} onChange={(e) => setHardCount(Number(e.target.value))} min={0} /></div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
                  Shuffle questions
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={showResults} onChange={(e) => setShowResults(e.target.checked)} />
                  Show results immediately
                </label>
              </div>

              <div>
                <label className="text-sm font-medium">Question Types</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {QUESTION_MODELS.map((m) => (
                    <Button key={m.value} variant={selectedModels.includes(m.value) ? 'default' : 'outline'} size="sm" onClick={() => toggleModel(m.value)}>{m.label}</Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetForm(); setShowCreate(false); }}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || !classId || !subjectId || createMutation.isPending}>Create Template</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Paper Preview: {previewTitle}</DialogTitle>
              <DialogDescription>Review the compiled question paper before scheduling.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {previewQuestions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No questions matched the criteria. Adjust your template settings.</p>
              ) : (
                previewQuestions.map((q, i) => (
                  <Card key={q.id || i} className="border-border/60">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-sm font-bold text-muted-foreground mt-0.5 min-w-[24px]">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] capitalize">{q.type?.replace(/_/g, ' ')}</Badge>
                            <Badge variant="secondary" className="text-[10px]">{q.difficulty}</Badge>
                            <span className="text-xs text-muted-foreground">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                          </div>
                          <p className="text-sm">{q.questionText}</p>
                          {q.options && q.options.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {q.options.map((opt, oi) => (
                                <p key={oi} className="text-xs text-muted-foreground pl-3 border-l-2 border-border">{String.fromCharCode(65 + oi)}. {opt}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <Button variant="outline" onClick={() => setShowPreview(false)}>Close</Button>
              <Button onClick={() => { setShowPreview(false); navigate(`/teacher/test-schedule?templateId=${compilingId}`); }} disabled={!compilingId}>
                <Icon name="calendar_month" size={16} className="mr-1" />Schedule to Class
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </>
  );
}
