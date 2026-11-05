import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/input';
import { cardStackReveal } from '@/lib/motion';
import { generateRubric, saveRubric, getRubrics } from '@/services/nepQuestionsService';
import type { GradingRubric, RubricCriterion } from '@/types/nepQuestions';

interface RubricGeneratorProps {
  assignments: { id: string; title: string; description?: string; totalMarks?: number }[];
  onRubricSaved?: () => void;
}

export function RubricGenerator({ assignments, onRubricSaved }: RubricGeneratorProps) {
  const queryClient = useQueryClient();
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [numCriteria, setNumCriteria] = useState(4);
  const [generatedRubric, setGeneratedRubric] = useState<GradingRubric | null>(null);

  const assignment = assignments.find((a) => a.id === selectedAssignment);

  const { data: savedRubrics } = useQuery({
    queryKey: ['rubrics', selectedAssignment],
    queryFn: () => getRubrics(selectedAssignment || undefined),
    enabled: !!selectedAssignment,
  });

  const generateMutation = useMutation({
    mutationFn: () => {
      if (!assignment) throw new Error('Select an assignment');
      return generateRubric({
        assignmentId: assignment.id,
        title: assignment.title,
        description: assignment.description || assignment.title,
        totalMarks: assignment.totalMarks || 20,
        numCriteria,
      });
    },
    onSuccess: (data) => {
      const rubric: GradingRubric = {
        ...data,
        id: '',
        assignmentId: assignment?.id || '',
        generatedAt: new Date().toISOString(),
      };
      setGeneratedRubric(rubric);
      toast.success('Rubric generated');
    },
    onError: () => toast.error('Failed to generate rubric'),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!generatedRubric || !assignment) throw new Error('No rubric to save');
      return saveRubric({
        assignmentId: assignment.id,
        title: generatedRubric.title,
        criteria: generatedRubric.criteria,
        totalMarks: generatedRubric.totalMarks,
      });
    },
    onSuccess: () => {
      toast.success('Rubric saved');
      setGeneratedRubric(null);
      queryClient.invalidateQueries({ queryKey: ['rubrics'] });
      onRubricSaved?.();
    },
    onError: () => toast.error('Failed to save rubric'),
  });

  const updateCriterion = (idx: number, field: keyof RubricCriterion, value: any) => {
    if (!generatedRubric) return;
    const updated = { ...generatedRubric };
    (updated.criteria[idx] as any)[field] = value;
    setGeneratedRubric(updated);
  };

  const updateLevel = (cIdx: number, lIdx: number, field: string, value: any) => {
    if (!generatedRubric) return;
    const updated = { ...generatedRubric };
    (updated.criteria[cIdx].levels[lIdx] as any)[field] = value;
    setGeneratedRubric(updated);
  };

  return (
    <div className="space-y-8">
      <motion.div variants={cardStackReveal} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Select Assignment</label>
          <select
            value={selectedAssignment}
            onChange={(e) => setSelectedAssignment(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1"
          >
            <option value="">Choose an assignment...</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Number of Criteria</label>
          <Input
            type="number"
            value={numCriteria}
            onChange={(e) => setNumCriteria(Math.max(2, Math.min(10, Number(e.target.value))))}
            min={2}
            max={10}
            className="mt-1"
          />
        </div>

        <Button
          onClick={() => generateMutation.mutate()}
          disabled={!selectedAssignment || generateMutation.isPending}
          loading={generateMutation.isPending}
          className="w-full"
        >
          <Icon name="auto_awesome" size={18} className="mr-2" />
          Generate Rubric with AI
        </Button>
      </motion.div>

      {savedRubrics && savedRubrics.length > 0 && (
        <motion.div variants={cardStackReveal} className="space-y-3">
          <h3 className="text-title-sm font-semibold">Saved Rubrics</h3>
          {savedRubrics.map((r) => (
            <Card key={r.id} className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-title-sm font-medium">{r.title}</p>
                    <p className="text-label-sm text-muted-foreground">{r.criteria.length} criteria · {r.totalMarks} total marks</p>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800">Saved</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {generatedRubric && (
        <motion.div variants={cardStackReveal} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-title-sm font-semibold">Generated Rubric</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setGeneratedRubric(null)}>Discard</Button>
              <Button size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
                <Icon name="save" size={16} className="mr-1" />
                Save Rubric
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rubric Title</label>
              <Input
                value={generatedRubric.title}
                onChange={(e) => setGeneratedRubric({ ...generatedRubric, title: e.target.value })}
                className="mt-1"
              />
            </div>

            {generatedRubric.criteria.map((criterion, cIdx) => (
              <Card key={cIdx} className="border-border/60 border-l-4 border-l-primary/40">
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-label-xs font-medium">Criterion Name</label>
                      <Input value={criterion.name} onChange={(e) => updateCriterion(cIdx, 'name', e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <label className="text-label-xs font-medium">Max Marks</label>
                      <Input
                        type="number"
                        value={criterion.maxMarks}
                        onChange={(e) => updateCriterion(cIdx, 'maxMarks', Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-label-xs font-medium">Description</label>
                    <textarea
                      value={criterion.description}
                      onChange={(e) => updateCriterion(cIdx, 'description', e.target.value)}
                      rows={2}
                      className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-label-xs font-medium">Performance Levels</p>
                    {criterion.levels.map((level, lIdx) => (
                      <div key={lIdx} className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-muted/50">
                        <div>
                          <label className="text-label-xs">Label</label>
                          <Input value={level.label} onChange={(e) => updateLevel(cIdx, lIdx, 'label', e.target.value)} className="mt-0.5" />
                        </div>
                        <div>
                          <label className="text-label-xs">Marks</label>
                          <Input
                            type="number"
                            value={level.marks}
                            onChange={(e) => updateLevel(cIdx, lIdx, 'marks', Number(e.target.value))}
                            className="mt-0.5"
                          />
                        </div>
                        <div>
                          <label className="text-label-xs">Description</label>
                          <Input value={level.description} onChange={(e) => updateLevel(cIdx, lIdx, 'description', e.target.value)} className="mt-0.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex justify-end">
              <p className="text-label-sm text-muted-foreground">
                Total Marks: <span className="font-semibold text-foreground">{generatedRubric.totalMarks}</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
