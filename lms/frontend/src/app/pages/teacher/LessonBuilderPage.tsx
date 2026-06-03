import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Eye, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';

const lessonSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  videoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  duration: z.string().min(1, 'Duration is required'),
  type: z.string().min(1, 'Type is required'),
  order: z.string().min(1, 'Order is required'),
  published: z.boolean(),
});

type LessonForm = z.infer<typeof lessonSchema>;

const lessonTypes = [
  { value: 'video', label: 'Video Lesson' },
  { value: 'document', label: 'Document' },
  { value: 'quiz', label: 'Quiz' },
];

export default function LessonBuilderPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!lessonId;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<LessonForm>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: isEditing ? 'Introduction to Linear Equations' : '',
      content: isEditing ? '<p>Lesson content here...</p>' : '',
      duration: isEditing ? '15' : '',
      type: 'video',
      order: '1',
      published: false,
    },
  });

  const mutation = useMutation({
    mutationFn: async () => { await new Promise(r => setTimeout(r, 1000)); },
    onSuccess: () => {
      toast.success(isEditing ? 'Lesson updated' : 'Lesson created');
      navigate(`/teacher/courses/${courseId}/manage`);
    },
    onError: () => { toast.error('Failed to save lesson'); },
  });

  return (
    <>
      <SEOHead title="Lesson Builder" description="Create and edit lessons" canonical="/teacher/courses" />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-4 max-w-3xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-1" />Preview</Button>
      </div>

      <h1 className="text-xl font-bold mb-4">{isEditing ? 'Edit Lesson' : 'Create Lesson'}</h1>

      <form onSubmit={handleSubmit(() => mutation.mutate())} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Lesson Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Lesson title" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select onValueChange={(v: string) => setValue('type', v)} defaultValue={watch('type')}>
                  <SelectTrigger id="type"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {lessonTypes.map(lt => <SelectItem key={lt.value} value={lt.value}>{lt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input id="duration" type="number" placeholder="15" {...register('duration')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="order">Order</Label>
              <Input id="order" type="number" placeholder="1" {...register('order')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea id="content" rows={8} placeholder="Lesson content (HTML supported)" {...register('content')} />
              {errors.content && <p className="text-sm text-destructive">{errors.content.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL (optional)</Label>
              <Input id="videoUrl" placeholder="https://..." {...register('videoUrl')} />
              {errors.videoUrl && <p className="text-sm text-destructive">{errors.videoUrl.message}</p>}
            </div>
            <div className="flex items-center justify-between">
              <Label>Published</Label>
              <Switch {...register('published')} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {isEditing ? 'Update Lesson' : 'Create Lesson'}
        </Button>
      </form>
    </motion.div>
    </>
  );
}
