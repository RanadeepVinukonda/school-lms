import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cardStackReveal } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

const RELEASE_OPTIONS = [
  { value: '', label: 'All assessments', icon: 'select_all' },
  { value: 'quiz', label: 'Quizzes only', icon: 'quiz' },
  { value: 'assignment', label: 'Assignments only', icon: 'checklist' },
  { value: 'exam', label: 'Exams only', icon: 'assignment' },
];

export default function TeacherResultsPushPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [releaseType, setReleaseType] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: assignments } = useQuery({
    queryKey: ['teacher-assignments', user?.id],
    queryFn: () => api.get('/teacher-class-subject/my').then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const releaseMutation = useMutation({
    mutationFn: () => api.post('/results-push/release-class', { classId: selectedClassId, type: releaseType || undefined }).then((r) => r.data.data),
    onSuccess: (data) => {
      toast.success(`Released grades for ${data.updatedCount} assessments`);
      setShowConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['class-analytics', selectedClassId] });
    },
    onError: () => toast.error('Failed to release grades'),
  });

  const classes = [...new Map((assignments ?? []).map((a: any) => [a.classId, { id: a.classId, name: a.className }])).values()] as any[];

  const selectedOption = RELEASE_OPTIONS.find((o) => o.value === releaseType) || RELEASE_OPTIONS[0];

  return (
    <>
      <SEOHead title="Release Grades" description="Batch release assessment grades to students" canonical="/teacher/release-grades" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-6 max-w-4xl mx-auto pb-32 space-y-16"
      >
        <motion.div variants={cardStackReveal} custom={0}>
          <h1 className="text-headline-sm">Release Grades</h1>
          <p className="text-body-md text-muted-foreground">Push assessment results to students</p>
        </motion.div>

        <motion.div variants={cardStackReveal} custom={0}>
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-title-sm">Step 1: Select Class</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
              >
                <option value="">Choose a class...</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </CardContent>
          </Card>
        </motion.div>

        {selectedClassId && (
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-title-sm">Step 2: Select Scope</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {RELEASE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setReleaseType(opt.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      releaseType === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <Icon name={opt.icon} size={20} className={releaseType === opt.value ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="font-medium text-body-md">{opt.label}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {selectedClassId && (
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-amber-200 dark:border-amber-800 border-border/60">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Icon name="warning" size={18} />
                  <p className="text-title-sm font-medium">Ready to release</p>
                </div>
                <p className="text-body-md text-muted-foreground">
                  This will make {selectedOption.label.toLowerCase()} results visible to all students in the selected class.
                  Students will be able to see their scores, correct answers, and feedback.
                </p>
                <Button
                  onClick={() => setShowConfirm(true)}
                  disabled={!selectedClassId || releaseMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <Icon name="send" size={16} className="mr-1" />
                  Release {selectedOption.label}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!selectedClassId && (
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-border/60">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Icon name="send" size={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-body-md">Select a class to release grades</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Release Grades</DialogTitle>
              <DialogDescription>
                Are you sure you want to release {selectedOption.label.toLowerCase()} results? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={releaseMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={() => releaseMutation.mutate()} disabled={releaseMutation.isPending}>
                {releaseMutation.isPending ? 'Releasing...' : 'Confirm Release'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </>
  );
}
