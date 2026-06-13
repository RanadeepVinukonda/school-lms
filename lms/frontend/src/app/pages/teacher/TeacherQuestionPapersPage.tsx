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
import { cardStackReveal } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export default function TeacherQuestionPapersPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [sections, setSections] = useState([{ title: 'Section A', instructions: '', questionIds: [''], pointsPerQuestion: 1 }]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['question-papers', user?.id],
    queryFn: () => api.get('/question-papers', { params: { createdBy: user?.id } }).then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/question-papers', { title, description: description || undefined, sections: sections.filter((s) => s.title.trim()), duration, createdBy: user?.id }),
    onSuccess: () => { toast.success('Question paper created'); setShowCreate(false); resetForm(); queryClient.invalidateQueries({ queryKey: ['question-papers'] }); },
    onError: () => toast.error('Failed to create question paper'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/question-papers/${id}`),
    onSuccess: () => { toast.success('Question paper deleted'); queryClient.invalidateQueries({ queryKey: ['question-papers'] }); },
    onError: () => toast.error('Failed to delete question paper'),
  });

  const markReadyMutation = useMutation({
    mutationFn: (id: string) => api.put(`/question-papers/${id}`, { status: 'ready' }),
    onSuccess: () => { toast.success('Paper marked as ready'); queryClient.invalidateQueries({ queryKey: ['question-papers'] }); },
  });

  function resetForm() { setTitle(''); setDescription(''); setDuration(60); setSections([{ title: 'Section A', instructions: '', questionIds: [''], pointsPerQuestion: 1 }]); }

  const addSection = () => setSections([...sections, { title: `Section ${String.fromCharCode(65 + sections.length)}`, instructions: '', questionIds: [''], pointsPerQuestion: 1 }]);
  const updateSection = (i: number, field: string, value: any) => {
    const copy = [...sections]; (copy as any)[i][field] = value; setSections(copy);
  };
  const addQuestionId = (i: number) => {
    const copy = [...sections]; copy[i].questionIds.push(''); setSections(copy);
  };

  return (
    <>
      <SEOHead title="Question Papers" description="Compose and manage question papers" canonical="/teacher/question-papers" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-6 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <motion.div variants={cardStackReveal} custom={0}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-headline-sm">Question Papers</h1>
              <p className="text-body-md text-muted-foreground">Compose reusable question papers from your question bank</p>
            </div>
            <Button onClick={() => setShowCreate(true)}><Icon name="add" size={16} className="mr-1" />New Paper</Button>
          </div>
        </motion.div>

        <motion.div variants={cardStackReveal} custom={0}>
          <DataFetchWrapper data={data} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="list">
            {(papers: any[]) => (
              <div className="space-y-2">
                {papers.length === 0 ? (
                  <Card className="border-border/60">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Icon name="description" size={48} className="mx-auto mb-3 opacity-40" />
                      <p className="text-body-md">No question papers yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  papers.map((p: any) => (
                    <Card key={p.id} className="border-border/60">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-title-sm font-semibold">{p.title}</h3>
                              <Badge variant={p.status === 'ready' ? 'default' : 'outline'} className="text-label-xs">{p.status}</Badge>
                            </div>
                            <p className="text-body-md text-muted-foreground">{p.description}</p>
                            <div className="flex items-center gap-3 mt-2 text-label-xs text-muted-foreground">
                              <span>{p.sections?.length || 0} sections</span>
                              <span>{p.totalPoints} total points</span>
                              {p.duration && <span>{p.duration} min</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {p.status === 'draft' && <Button variant="outline" size="sm" onClick={() => markReadyMutation.mutate(p.id)}>Mark Ready</Button>}
                            <Button variant="ghost" size="icon-sm" onClick={() => { if (confirm('Delete this paper?')) deleteMutation.mutate(p.id); }}><Icon name="delete" size={16} /></Button>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Question Paper</DialogTitle>
              <DialogDescription>Add sections and reference questions by their IDs from the question bank.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Paper title" />
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
              <Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} placeholder="Duration (minutes)" min={1} />

              {sections.map((sec, i) => (
                <Card key={i} className="border-border/60">
                  <CardContent className="p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <Input value={sec.title} onChange={(e) => updateSection(i, 'title', e.target.value)} placeholder="Section title" className="max-w-xs" />
                      {sections.length > 1 && <Button variant="ghost" size="icon-sm" onClick={() => setSections(sections.filter((_, j) => j !== i))}><Icon name="close" size={16} /></Button>}
                    </div>
                    <Input value={sec.instructions || ''} onChange={(e) => updateSection(i, 'instructions', e.target.value)} placeholder="Instructions (optional)" />
                    <Input type="number" value={sec.pointsPerQuestion} onChange={(e) => updateSection(i, 'pointsPerQuestion', Number(e.target.value))} placeholder="Points per question" min={1} className="max-w-[180px]" />
                    <div className="space-y-1">
                      <p className="text-label-xs text-muted-foreground">Question IDs (Firestore document IDs from question bank):</p>
                      {sec.questionIds.map((qid, qi) => (
                        <div key={qi} className="flex items-center gap-1">
                          <Input value={qid} onChange={(e) => { const c = [...sections]; c[i].questionIds[qi] = e.target.value; setSections(c); }} placeholder="Question ID" className="text-label-xs font-mono" />
                          {sec.questionIds.length > 1 && <Button variant="ghost" size="icon-sm" onClick={() => { const c = [...sections]; c[i].questionIds.splice(qi, 1); setSections(c); }}><Icon name="close" size={14} /></Button>}
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => addQuestionId(i)}><Icon name="add" size={14} className="mr-1" />Add Question</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button variant="outline" onClick={addSection}><Icon name="add" size={16} className="mr-1" />Add Section</Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetForm(); setShowCreate(false); }}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || createMutation.isPending}>Create Paper</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </>
  );
}
