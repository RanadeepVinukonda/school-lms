import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { sanitizeHtml } from '@/lib/sanitize';
import {
  ArrowLeft, FileText, Clock, AlertCircle, CheckCircle,
  Upload, Download, Calendar, Loader2
} from 'lucide-react';
import { pageTransition } from '@/lib/motion';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation } from '@tanstack/react-query';
import { mockAssignments } from '@/lib/mockData';
import type { Assignment } from '@/types';

const submitSchema = z.object({
  content: z.string().min(10, 'Submission must be at least 10 characters').optional(),
});

function AssignmentSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-48 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}

export default function AssignmentDetailPage() {
  const { assignmentId } = useParams();
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingContent, setPendingContent] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(submitSchema),
  });

  const content = watch('content');

  const { data: assignment, isLoading, isError } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 300));
      return mockAssignments.find((a) => a.id === assignmentId) as Assignment | undefined;
    },
    enabled: !!assignmentId,
  });

  const submitMutation = useMutation({
    mutationFn: async (_content: string) => {
      await new Promise((r) => setTimeout(r, 500));
      return;
    },
    onSuccess: () => {
      toast.success('Assignment submitted successfully!');
      setShowConfirm(false);
    },
    onError: () => {
      toast.error('Failed to submit assignment');
    },
  });

  if (isLoading) return <AssignmentSkeleton />;

  if (isError || !assignment) {
    return (
      <div className="p-4">
        <Card><CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-medium">Assignment not found</p>
          <Button asChild><Link to="/student/dashboard">Go to Dashboard</Link></Button>
        </CardContent></Card>
      </div>
    );
  }

  const isOverdue = new Date(assignment.dueDate) < new Date();
  const statusVariant = isOverdue ? 'destructive' : assignment.status === 'published' ? 'warning' : 'secondary';

  return (
    <>
      <SEOHead title={assignment.title} description={`Assignment: ${assignment.title}`} canonical={`/assignments/${assignmentId}`} />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-3xl mx-auto pb-20">
      <Button variant="ghost" size="sm" asChild className="mb-3">
        <Link to="/student/dashboard"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
      </Button>

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{assignment.title}</CardTitle>
              <CardDescription>Course ID: {assignment.courseId}</CardDescription>
            </div>
            <Badge variant={statusVariant}>
              {isOverdue ? 'Overdue' : assignment.status === 'published' ? 'Open' : assignment.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1"><Calendar className="h-4 w-4 text-muted-foreground" />Due {new Date(assignment.dueDate).toLocaleDateString()}</span>
            <span className="flex items-center gap-1"><FileText className="h-4 w-4 text-muted-foreground" />{assignment.points} pts</span>
          </div>
          <div className="text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(assignment.instructions || '') }} />
          {assignment.attachments?.map((a, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted">
              <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><span className="text-sm">{a}</span></div>
              <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Submit Assignment</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(() => setShowConfirm(true))} className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Drop files here or click to upload</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Notes</label>
              <Textarea placeholder="Add any notes about your submission..." rows={3} {...register('content')} />
              {errors.content && <p className="text-sm text-destructive">{errors.content.message as string}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
              {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Submit Assignment
            </Button>
          </form>
        </CardContent>
      </Card>

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader><CardTitle>Confirm Submission</CardTitle><CardDescription>Are you sure you want to submit this assignment?</CardDescription></CardHeader>
            <CardContent className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => submitMutation.mutate(content || '')}>Confirm</Button>
            </CardContent>
          </Card>
        </div>
      )}
      </motion.div>
    </>
  );
}
