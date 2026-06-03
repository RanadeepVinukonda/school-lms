import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical, Loader2,
  HelpCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { OptionsSelect } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useMutation } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';

const quizSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  timeLimit: z.string().min(1, 'Time limit is required'),
  passingScore: z.string().min(1, 'Passing score is required'),
  shuffleQuestions: z.boolean(),
});

type QuizForm = z.infer<typeof quizSchema>;
type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'short_answer';

interface QuestionItem {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string;
  points: number;
}

const questionTypeOptions = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'short_answer', label: 'Short Answer' },
];

export default function QuizBuilderPage() {
  const { courseId, quizId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!quizId;
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<QuizForm>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: '',
      description: '',
      timeLimit: '10',
      passingScore: '60',
      shuffleQuestions: false,
    },
  });

  const mutation = useMutation({
    mutationFn: async () => { await new Promise(r => setTimeout(r, 1000)); },
    onSuccess: () => {
      toast.success(isEditing ? 'Quiz updated' : 'Quiz created');
      navigate(`/teacher/courses/${courseId}/manage`);
    },
    onError: () => { toast.error('Failed to save quiz'); },
  });

  const addQuestion = () => {
    const newQ: QuestionItem = {
      id: crypto.randomUUID(),
      type: 'mcq',
      text: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 10,
    };
    setQuestions(prev => [...prev, newQ]);
    setExpandedQuestion(newQ.id);
  };

  const updateQuestion = (id: string, field: keyof QuestionItem, value: unknown) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  return (
    <>
      <SEOHead title="Quiz Builder" description="Create and edit quizzes" canonical="/teacher/courses" />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 max-w-3xl mx-auto pb-20">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />Back
      </Button>

      <h1 className="text-xl font-bold mb-4">{isEditing ? 'Edit Quiz' : 'Create Quiz'}</h1>

      <form onSubmit={handleSubmit(() => mutation.mutate())} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Quiz Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Quiz title" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} placeholder="Quiz description..." {...register('description')} />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                <Input id="timeLimit" type="number" {...register('timeLimit')} />
                {errors.timeLimit && <p className="text-sm text-destructive">{errors.timeLimit.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="passingScore">Passing Score (%)</Label>
                <Input id="passingScore" type="number" {...register('passingScore')} />
                {errors.passingScore && <p className="text-sm text-destructive">{errors.passingScore.message}</p>}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Shuffle Questions</Label>
              <Switch {...register('shuffleQuestions')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Questions ({questions.length})</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
              <Plus className="h-4 w-4 mr-1" />Add Question
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No questions yet. Click "Add Question" to get started.
              </p>
            )}
            {questions.map((q, i) => (
              <Card key={q.id} className="border-muted">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <Badge variant="outline" className="text-xs">Q{i + 1}</Badge>
                      <span className="text-xs text-muted-foreground capitalize">{q.type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedQuestion(expandedQuestion === q.id ? null : q.id)}>
                        {expandedQuestion === q.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeQuestion(q.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <Input
                    placeholder="Question text"
                    value={q.text}
                    onChange={e => updateQuestion(q.id, 'text', e.target.value)}
                    className="text-sm mb-2"
                  />

                  {expandedQuestion === q.id && (
                    <div className="space-y-3 mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Type</Label>
                        <OptionsSelect
                          options={questionTypeOptions}
                          value={q.type}
                          onChange={(v: string) => updateQuestion(q.id, 'type', v)}
                          className="flex-1"
                        />
                        <Label className="text-xs">Points</Label>
                        <Input
                          type="number"
                          value={q.points}
                          onChange={e => updateQuestion(q.id, 'points', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </div>

                      {(q.type === 'mcq') && (
                        <div className="space-y-2">
                          <Label className="text-xs">Options</Label>
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <Input
                                placeholder={`Option ${oi + 1}`}
                                value={opt}
                                onChange={e => {
                                  const newOpts = [...q.options];
                                  newOpts[oi] = e.target.value;
                                  updateQuestion(q.id, 'options', newOpts);
                                }}
                                className="text-sm"
                              />
                              <Button
                                type="button"
                                variant={q.correctAnswer === opt ? 'default' : 'outline'}
                                size="sm"
                                className="text-xs"
                                onClick={() => updateQuestion(q.id, 'correctAnswer', opt)}
                              >
                                Correct
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {(q.type === 'true_false') && (
                        <div className="flex gap-2">
                          {['True', 'False'].map(opt => (
                            <Button
                              key={opt}
                              type="button"
                              variant={q.correctAnswer === opt ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateQuestion(q.id, 'correctAnswer', opt)}
                            >
                              {opt}
                            </Button>
                          ))}
                        </div>
                      )}

                      {(q.type === 'fill_blank' || q.type === 'short_answer') && (
                        <div className="space-y-2">
                          <Label className="text-xs">Correct Answer</Label>
                          <Input
                            placeholder="Correct answer"
                            value={q.correctAnswer}
                            onChange={e => updateQuestion(q.id, 'correctAnswer', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {isEditing ? 'Update Quiz' : 'Create Quiz'}
        </Button>
      </form>
    </motion.div>
    </>
  );
}
