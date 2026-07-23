import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { QuestionRenderer } from '@/components/teacher/QuestionRenderer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cardStackReveal } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'fill_blank', label: 'Fill in Blank' },
  { value: 'matching', label: 'Matching' },
  { value: 'essay', label: 'Essay' },
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const BLOOM_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

function QuestionForm({ initial, onSave, loading }: { initial?: any; onSave: (data: any) => void; loading: boolean }) {
  const { _ } = useTranslation();
  const [text, setText] = useState(initial?.text || '');
  const [type, setType] = useState(initial?.type || 'multiple_choice');
  const [difficulty, setDifficulty] = useState(initial?.difficulty || 'medium');
  const [options, setOptions] = useState(initial?.options?.join('\n') || '');
  const [correctAnswer, setCorrectAnswer] = useState(initial?.correctAnswer || '');
  const [points, setPoints] = useState(initial?.points || 1);
  const [explanation, setExplanation] = useState(initial?.explanation || '');
  const [bloomLevel, setBloomLevel] = useState(initial?.bloomLevel || '');
  const [hots, setHots] = useState(initial?.hots === true);
  const [source, setSource] = useState(initial?.source || 'Manual');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) { toast.error(_('Question text is required')); return; }
    if (!correctAnswer.trim()) { toast.error(_('Correct answer is required')); return; }
    onSave({
      text,
      type,
      difficulty,
      options: (type === 'multiple_choice' || type === 'matching') ? options.split('\n').filter(Boolean) : undefined,
      correctAnswer,
      points: Number(points),
      explanation: explanation || undefined,
      bloomLevel: bloomLevel || undefined,
      hots,
      source,
      tags: [],
      classId: '',
      subjectId: '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">{_('Question Text')}</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1" placeholder={_('Enter question text...')} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">{_('Type')}</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1">
            {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{_(t.label)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">{_('Difficulty')}</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1">
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{_(d.charAt(0).toUpperCase() + d.slice(1))}</option>)}
          </select>
        </div>
      </div>
      {type === 'multiple_choice' && (
        <div>
          <label className="text-sm font-medium">{_('Options (one per line)')}</label>
          <textarea value={options} onChange={(e) => setOptions(e.target.value)} rows={4} className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1" placeholder={_('Option A\nOption B\nOption C\nOption D')} />
        </div>
      )}
      {type === 'matching' && (
        <div>
          <label className="text-sm font-medium">{_('Matching Pairs')}</label>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">{_('Enter one pair per line using Left - Right format:')}</p>
          <textarea value={options} onChange={(e) => setOptions(e.target.value)} rows={4} className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1 font-mono" placeholder={_('Combing - Hair care\nEating - Consuming food\nPlaying - Having fun')} />
          <p className="text-xs text-muted-foreground mt-1">
            {_('Correct Answer format (e.g., Combing:Hair care|Eating:Consuming food|Playing:Having fun)')}
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">{_('Correct Answer')}</label>
          <Input value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} placeholder={_('Correct answer')} />
        </div>
        <div>
          <label className="text-sm font-medium">{_('Points')}</label>
          <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} min={1} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium">{_('Bloom\'s Level')}</label>
          <select value={bloomLevel} onChange={(e) => setBloomLevel(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1">
            <option value="">{_('None')}</option>
            {BLOOM_LEVELS.map((l) => <option key={l} value={l}>{_(l)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">{_('HOTS')}</label>
          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" checked={hots} onChange={(e) => setHots(e.target.checked)} className="rounded" />
            <span className="text-sm">{_('Higher Order Thinking')}</span>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">{_('Source')}</label>
          <input value={source} onChange={(e) => setSource(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1" placeholder={_('e.g. Manual, AI Upload')} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">{_('Explanation (optional)')}</label>
        <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1" placeholder={_('Explain the answer...')} />
      </div>
      <Button type="submit" disabled={loading}>{_(initial ? 'Update' : 'Create')} {_('Question')}</Button>
    </form>
  );
}

export default function TeacherQuestionBankPage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [diffFilter, setDiffFilter] = useState('');
  const [bloomFilter, setBloomFilter] = useState('');
  const [hotsFilter, setHotsFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['question-bank', user?.id, typeFilter, diffFilter],
    queryFn: () => api.get('/question-bank', { params: { createdBy: user?.id, type: typeFilter || undefined, difficulty: diffFilter || undefined } }).then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => editing ? api.put(`/question-bank/${editing.id}`, body) : api.post('/question-bank', body),
    onSuccess: () => { toast.success(_(editing ? 'Question updated' : 'Question created')); setShowCreate(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ['question-bank'] }); },
    onError: () => toast.error(_('Failed to save question')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/question-bank/${id}`),
    onSuccess: () => { toast.success(_('Question deleted')); queryClient.invalidateQueries({ queryKey: ['question-bank'] }); },
    onError: () => toast.error(_('Failed to delete question')),
  });

  const items: any[] = (data?.items || []).filter((q: any) => {
    if (search && !q.text?.toLowerCase().includes(search.toLowerCase())) return false;
    if (bloomFilter && q.bloomLevel !== bloomFilter) return false;
    if (hotsFilter === 'true' && q.hots !== true) return false;
    if (hotsFilter === 'false' && q.hots === true) return false;
    if (sourceFilter && q.source !== sourceFilter) return false;
    return true;
  });

  const typeColors: Record<string, string> = { multiple_choice: 'bg-blue-500', true_false: 'bg-purple-500', short_answer: 'bg-amber-500', fill_blank: 'bg-emerald-500', matching: 'bg-rose-500', essay: 'bg-sky-500' };
  const diffColors: Record<string, string> = { easy: 'bg-green-100 text-green-800', medium: 'bg-yellow-100 text-yellow-800', hard: 'bg-red-100 text-red-800' };

  return (
    <>
      <SEOHead title={_('Question Bank')} description={_('Create and manage your question bank')} canonical="/teacher/question-bank" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <motion.div variants={cardStackReveal} custom={0}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-headline-sm">{_('Question Bank')}</h1>
              <p className="text-body-md text-muted-foreground">{_('Create, manage, and organize your questions')}</p>
            </div>
            <Button onClick={() => { setEditing(null); setShowCreate(true); }}>
              <Icon name="add" size={16} className="mr-1" />{_('New Question')}
            </Button>
          </div>
        </motion.div>

        <motion.div variants={cardStackReveal} custom={0}>
          <div className="flex flex-wrap gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={_('Search questions...')} className="max-w-xs" />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-background">
              <option value="">{_('All Types')}</option>
              {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{_(t.label)}</option>)}
            </select>
            <select value={diffFilter} onChange={(e) => setDiffFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-background">
              <option value="">{_('All Difficulties')}</option>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{_(d.charAt(0).toUpperCase() + d.slice(1))}</option>)}
            </select>
            <select value={bloomFilter} onChange={(e) => setBloomFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-background">
              <option value="">{_('All Bloom Levels')}</option>
              {BLOOM_LEVELS.map((l) => <option key={l} value={l}>{_(l)}</option>)}
            </select>
            <select value={hotsFilter} onChange={(e) => setHotsFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-background">
              <option value="">{_('All HOTS')}</option>
              <option value="true">{_('HOTS Only')}</option>
              <option value="false">{_('Non-HOTS')}</option>
            </select>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-background">
              <option value="">{_('All Sources')}</option>
              <option value="Manual">{_('Manual')}</option>
              <option value="AI Textbook Upload">{_('AI Textbook Upload')}</option>
              <option value="AI Quiz Generation">{_('AI Quiz Generation')}</option>
              <option value="Imported from Concept">{_('Imported from Concept')}</option>
            </select>
          </div>
        </motion.div>

        <motion.div variants={cardStackReveal} custom={0}>
          <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="list">
            {() => (
              <div className="space-y-2">
                {items.length === 0 ? (
                  <Card className="border-border/60">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Icon name="quiz" size={48} className="mx-auto mb-3 opacity-40" />
                      <p className="text-body-md">{_('No questions found. Create your first question!')}</p>
                    </CardContent>
                  </Card>
                ) : (
                  items.map((q: any) => (
                    <Card key={q.id} className="border-border/60">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className={`text-label-xs ${typeColors[q.type] || 'bg-gray-500'} text-white`}>{q.type.replace('_', ' ')}</Badge>
                              <Badge variant="outline" className={`text-label-xs ${diffColors[q.difficulty] || ''}`}>{q.difficulty}</Badge>
                              {q.bloomLevel && <Badge variant="secondary" className="text-label-xs">{q.bloomLevel}</Badge>}
                              {q.hots === true && <Badge variant="secondary" className="text-label-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">HOTS</Badge>}
                              {q.source && <Badge variant="outline" className="text-label-xs text-muted-foreground">{q.source}</Badge>}
                              {q.isPreviousYear && <Badge variant="secondary" className="text-label-xs">PYQ {q.year || ''}</Badge>}
                            </div>
                            <QuestionRenderer question={{ type: q.type, text: q.text }} />
                            {q.explanation && <p className="text-label-xs text-muted-foreground mt-1 line-clamp-1">{q.explanation}</p>}
                            <p className="text-label-xs text-muted-foreground mt-1">{q.points} pt{q.points !== 1 ? 's' : ''}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(q); setShowCreate(true); }}><Icon name="edit" size={16} /></Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => { if (confirm(_('Delete this question?'))) deleteMutation.mutate(q.id); }}><Icon name="delete" size={16} /></Button>
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

        <Dialog open={showCreate} onOpenChange={(o) => { if (!o) { setShowCreate(false); setEditing(null); } }}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{_(editing ? 'Edit Question' : 'Create Question')}</DialogTitle>
              <DialogDescription>{_('Fill in the question details below.')}</DialogDescription>
            </DialogHeader>
            <QuestionForm initial={editing} onSave={(formData) => createMutation.mutate(formData)} loading={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </motion.div>
    </>
  );
}
