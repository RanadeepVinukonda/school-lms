import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/input';
import { QuestionTypeCard } from './QuestionTypeCard';
import { cardStackReveal } from '@/lib/motion';
import { generateQuestions, saveQuestions } from '@/services/nepQuestionsService';
import type { NEPQuestion, NEPQuestionType } from '@/types/nepQuestions';

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'hard', label: 'Hard', color: 'bg-red-100 text-red-800' },
];

interface ConceptOption {
  id: string;
  name: string;
  subject: string;
}

interface NEPQuestionGeneratorProps {
  concepts: ConceptOption[];
  onQuestionsSaved?: () => void;
}

export function NEPQuestionGenerator({ concepts, onQuestionsSaved }: NEPQuestionGeneratorProps) {
  const [selectedConcept, setSelectedConcept] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<NEPQuestionType[]>([]);
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(5);
  const [generatedQuestions, setGeneratedQuestions] = useState<NEPQuestion[]>([]);

  const concept = concepts.find((c) => c.id === selectedConcept);

  const generateMutation = useMutation({
    mutationFn: () => {
      if (!concept) throw new Error('Select a concept');
      return generateQuestions({
        conceptId: concept.id,
        conceptName: concept.name,
        subject: concept.subject,
        types: selectedTypes,
        difficulty,
        count,
      });
    },
    onSuccess: (data) => {
      setGeneratedQuestions(data);
      toast.success(`Generated ${data.length} questions`);
    },
    onError: () => toast.error('Failed to generate questions'),
  });

  const saveMutation = useMutation({
    mutationFn: () => saveQuestions(selectedConcept, generatedQuestions),
    onSuccess: (data) => {
      toast.success(`${data.length} questions saved to concept bank`);
      setGeneratedQuestions([]);
      onQuestionsSaved?.();
    },
    onError: () => toast.error('Failed to save questions'),
  });

  const toggleType = (type: NEPQuestionType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const typeBadgeColors: Record<string, string> = {
    olympiad: 'bg-amber-500 text-white',
    competency: 'bg-emerald-500 text-white',
    viva: 'bg-violet-500 text-white',
  };

  const diffColorMap: Record<string, string> = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-8">
      <motion.div variants={cardStackReveal} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Select Concept</label>
          <select
            value={selectedConcept}
            onChange={(e) => setSelectedConcept(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1"
          >
            <option value="">Choose a concept...</option>
            {concepts.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.subject})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Question Types</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            <QuestionTypeCard type="olympiad" selected={selectedTypes.includes('olympiad')} onToggle={() => toggleType('olympiad')} />
            <QuestionTypeCard type="competency" selected={selectedTypes.includes('competency')} onToggle={() => toggleType('competency')} />
            <QuestionTypeCard type="viva" selected={selectedTypes.includes('viva')} onToggle={() => toggleType('viva')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background mt-1"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Questions per Type</label>
            <Input
              type="number"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value))))}
              min={1}
              max={20}
              className="mt-1"
            />
          </div>
        </div>

        <Button
          onClick={() => generateMutation.mutate()}
          disabled={!selectedConcept || selectedTypes.length === 0 || generateMutation.isPending}
          loading={generateMutation.isPending}
          className="w-full"
        >
          <Icon name="auto_awesome" size={18} className="mr-2" />
          Generate Questions
        </Button>
      </motion.div>

      {generatedQuestions.length > 0 && (
        <motion.div variants={cardStackReveal} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-title-sm font-semibold">Preview ({generatedQuestions.length} questions)</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setGeneratedQuestions([])}>Clear</Button>
              <Button size="sm" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
                <Icon name="save" size={16} className="mr-1" />
                Save to Bank
              </Button>
            </div>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {generatedQuestions.map((q, idx) => (
              <Card key={idx} className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-label-sm font-bold text-primary">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="outline" className={`text-label-xs ${typeBadgeColors[q.type]}`}>{q.type}</Badge>
                        <Badge variant="outline" className={`text-label-xs ${diffColorMap[q.difficulty]}`}>{q.difficulty}</Badge>
                        <Badge variant="outline" className="text-label-xs">{q.marks} mark{q.marks !== 1 ? 's' : ''}</Badge>
                        {q.competencyArea && (
                          <Badge variant="outline" className="text-label-xs bg-blue-100 text-blue-800">{q.competencyArea}</Badge>
                        )}
                      </div>
                      <p className="text-body-sm font-medium">{q.question}</p>
                      {q.options && q.options.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {q.options.map((opt, oi) => (
                            <p key={oi} className="text-label-sm text-muted-foreground pl-3 border-l-2 border-border">
                              {String.fromCharCode(65 + oi)}. {opt}
                            </p>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 p-3 rounded-lg bg-green-50 border border-green-200">
                        <p className="text-label-sm font-medium text-green-800">Answer: {q.correctAnswer}</p>
                        <p className="text-label-sm text-green-700 mt-1">{q.explanation}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
