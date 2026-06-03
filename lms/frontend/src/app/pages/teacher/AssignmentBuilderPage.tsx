import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useMutation } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';

const assignmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  instructions: z.string().min(1, 'Instructions are required'),
  dueDate: z.string().min(1, 'Due date is required'),
  maxPoints: z.string().min(1, 'Max points is required'),
  allowResubmission: z.boolean(),
});

type AssignmentForm = z.infer<typeof assignmentSchema>;

interface RubricCriterion {
  id: string;
  name: string;
  maxPoints: number;
}

export default function AssignmentBuilderPage() {
  const { courseId, assignmentId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!assignmentId;
  const [rubric, setRubric] = useState<RubricCriterion[]>([]);

  const { register, handleSubmit, formState: { errors } } = useForm<AssignmentForm>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      title: '',
      instructions: '',
      dueDate: '',
      maxPoints: '100',
      allowResubmission: false,
    },
  });

  const mutation = useMutation({
    mutationFn: async () => { await new Promise(r => setTimeout(r, 1000)); },
    onSuccess: () => {
      toast.success(isEditing ? 'Assignment updated' : 'Assignment created');
      navigate(`/teacher/courses/${courseId}/manage`);
    },
    onError: () => { toast.error('Failed to save assignment'); },
  });

  const addRubricItem = () => {
    setRubric(prev => [...prev, { id: crypto.randomUUID(), name: '', maxPoints: 0 }]);
  };

  const updateRubric = (id: string, field: keyof RubricCriterion, value: string | number) => {
    setRubric(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRubric = (id: string) => {
    setRubric(prev => prev.filter(r => r.id !== id));
  };

  return (
    <>
      <SEOHead title="Assignment Builder" description="Create and edit assignments" canonical="/teacher/courses" />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 max-w-3xl mx-auto pb-20">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />Back
      </Button>

      <h1 className="text-xl font-bold mb-4">{isEditing ? 'Edit Assignment' : 'Create Assignment'}</h1>

      <form onSubmit={handleSubmit(() => mutation.mutate())} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Assignment Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Assignment title" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea id="instructions" rows={6} placeholder="Assignment instructions..." {...register('instructions')} />
              {errors.instructions && <p className="text-sm text-destructive">{errors.instructions.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" type="date" {...register('dueDate')} />
                {errors.dueDate && <p className="text-sm text-destructive">{errors.dueDate.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPoints">Max Points</Label>
                <Input id="maxPoints" type="number" {...register('maxPoints')} />
                {errors.maxPoints && <p className="text-sm text-destructive">{errors.maxPoints.message}</p>}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Allow Resubmission</Label>
              <Switch {...register('allowResubmission')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Rubric</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addRubricItem}>
              <Plus className="h-4 w-4 mr-1" />Add Criterion
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {rubric.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No rubric criteria added yet.</p>
            )}
            {rubric.map(r => (
              <div key={r.id} className="flex items-center gap-2">
                <Input
                  placeholder="Criterion name"
                  value={r.name}
                  onChange={e => updateRubric(r.id, 'name', e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Points"
                  value={r.maxPoints || ''}
                  onChange={e => updateRubric(r.id, 'maxPoints', parseInt(e.target.value) || 0)}
                  className="w-20"
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeRubric(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {isEditing ? 'Update Assignment' : 'Create Assignment'}
        </Button>
      </form>
    </motion.div>
    </>
  );
}
