import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { pageTransition } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

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
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState<'question_paper' | 'question_bank'>('question_bank');
  const [questionPaperId, setQuestionPaperId] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);
  const [passingScore, setPassingScore] = useState(50);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [shuffle, setShuffle] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>(['multiple_choice', 'true_false']);
  const [questionCount, setQuestionCount] = useState(10);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['test-templates', user?.id],
    queryFn: () => api.get('/test-templates', { params: { createdBy: user?.id } }).then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/test-templates', {
      title, description: description || undefined,
      classId: '', subjectId: '', source, questionPaperId: questionPaperId || undefined,
      config: { timeLimitMinutes: timeLimit, passingScore, maxAttempts, shuffleQuestions: shuffle, showResults },
      selectionConfig: source === 'question_bank' ? { selectedModels, questionCount, difficultyDistribution: { easy: 3, medium: 5, hard: 2 } } : undefined,
    }),
    onSuccess: () => { toast.success('Template created'); setShowCreate(false); resetForm(); queryClient.invalidateQueries({ queryKey: ['test-templates'] }); },
    onError: () => toast.error('Failed to create template'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/test-templates/${id}`),
    onSuccess: () => { toast.success('Template deleted'); queryClient.invalidateQueries({ queryKey: ['test-templates'] }); },
  });

  function resetForm() { setTitle(''); setDescription(''); setSource('question_bank'); setQuestionPaperId(''); setTimeLimit(30); setPassingScore(50); setMaxAttempts(1); setShuffle(true); setShowResults(false); setSelectedModels(['multiple_choice', 'true_false']); setQuestionCount(10); }

  const toggleModel = (val: string) => {
    setSelectedModels((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);
  };

  return (
    <>
      <SEOHead title="Test Templates" description="Create reusable test templates" canonical="/teacher/test-templates" />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-6xl mx-auto space-y-6 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-headline-sm">Test Templates</h1>
            <p className="text-sm text-muted-foreground">Reusable assessment blueprints</p>
          </div>
          <Button onClick={() => setShowCreate(true)}><Icon name="add" size={16} className="mr-1" />New Template</Button>
        </div>

        <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="list">
          {(templates: any[]) => (
            <div className="space-y-2">
              {templates.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground"><Icon name="description" size={48} className="mx-auto mb-3 opacity-40" /><p>No templates yet.</p></CardContent></Card>
              ) : (
                templates.map((t: any) => (
                  <Card key={t.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{t.title}</h3>
                            <Badge variant={t.status === 'active' ? 'default' : t.status === 'archived' ? 'secondary' : 'outline'} className="text-xs">{t.status}</Badge>
                            <Badge variant="outline" className="text-xs">{t.source}</Badge>
                          </div>
                          {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{t.config?.timeLimitMinutes} min</span>
                            <span>Pass: {t.config?.passingScore}%</span>
                            <span>Max attempts: {t.config?.maxAttempts}</span>
                            <span>{t.config?.shuffleQuestions ? 'Shuffled' : 'Ordered'}</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon-sm" onClick={() => { if (confirm('Delete this template?')) deleteMutation.mutate(t.id); }}><Icon name="delete" size={16} /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </DataFetchWrapper>

        <Dialog open={showCreate} onOpenChange={(o) => { if (!o) resetForm(); setShowCreate(o); }}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Test Template</DialogTitle>
              <DialogDescription>Set up a reusable assessment blueprint.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Template title" />
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />

              <div>
                <label className="text-sm font-medium">Question Source</label>
                <div className="flex gap-2 mt-1">
                  <Button variant={source === 'question_bank' ? 'default' : 'outline'} size="sm" onClick={() => setSource('question_bank')}>From Question Bank</Button>
                  <Button variant={source === 'question_paper' ? 'default' : 'outline'} size="sm" onClick={() => setSource('question_paper')}>From Question Paper</Button>
                </div>
              </div>

              {source === 'question_paper' && (
                <Input value={questionPaperId} onChange={(e) => setQuestionPaperId(e.target.value)} placeholder="Question Paper ID" />
              )}

              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Time Limit (min)</label><Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} min={1} /></div>
                <div><label className="text-sm font-medium">Passing Score (%)</label><Input type="number" value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} min={0} max={100} /></div>
                <div><label className="text-sm font-medium">Max Attempts</label><Input type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} min={1} /></div>
                <div><label className="text-sm font-medium">Question Count</label><Input type="number" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} min={1} /></div>
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

              {source === 'question_bank' && (
                <div>
                  <label className="text-sm font-medium">Question Types</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {QUESTION_MODELS.map((m) => (
                      <Button key={m.value} variant={selectedModels.includes(m.value) ? 'default' : 'outline'} size="sm" onClick={() => toggleModel(m.value)}>{m.label}</Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetForm(); setShowCreate(false); }}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || createMutation.isPending}>Create Template</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </>
  );
}
