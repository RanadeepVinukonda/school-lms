import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useClasses } from '@/hooks/useClasses';
import { formatClassName } from '@/services/classService';
import api from '@/services/api';

const RELEASE_OPTIONS = [
  { value: '', label: 'All assessments', icon: 'select_all' },
  { value: 'quiz', label: 'Quizzes only', icon: 'quiz' },
  { value: 'assignment', label: 'Assignments only', icon: 'checklist' },
  { value: 'exam', label: 'Exams only', icon: 'assignment' },
];

export default function TeacherResultsPushPage() {
  const { _ } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [releaseType, setReleaseType] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const { data: classes = [] } = useClasses();
  const releaseMutation = useMutation({
    mutationFn: () => api.post('/results-push/release-class', { classId: selectedClassId, type: releaseType || undefined }).then((r) => r.data.data),
    onSuccess: (data) => {
      toast.success(`${_('Released grades for')} ${data.updatedCount} ${_('assessments')}`);
      setShowConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['class-analytics', selectedClassId] });
    },
    onError: () => toast.error(_('Failed to release grades')),
  });

  const selectedOption = RELEASE_OPTIONS.find((o) => o.value === releaseType) || RELEASE_OPTIONS[0];

  return (
    <>
      <SEOHead title={_('Release Grades')} description={_('Batch release assessment grades to students')} canonical="/teacher/release-grades" />
      <div



        className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-16"
      >
        <div>
          <h1 className="text-headline-sm">{_('Release Grades')}</h1>
          <p className="text-body-md text-muted-foreground">{_('Push assessment results to students')}</p>
        </div>

        <div>
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-title-sm">{_('Step 1: Select Class')}</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background text-foreground"
              >
                <option value="">{_('Choose a class...')}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{formatClassName(c)}</option>
                ))}
              </select>
            </CardContent>
          </Card>
        </div>

        {selectedClassId && (
          <div>
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-title-sm">{_('Step 2: Select Scope')}</CardTitle>
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
                    <span className="font-medium text-body-md">{_(opt.label)}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {selectedClassId && (
          <div>
            <Card className="border-amber-200 dark:border-amber-800 border-border/60">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Icon name="warning" size={18} />
                  <p className="text-title-sm font-medium">{_('Ready to release')}</p>
                </div>
                <p className="text-body-md text-muted-foreground">
                  {_('This will make')} {selectedOption.label.toLowerCase()} {_('results visible to all students in the selected class.')}
                  {_('Students will be able to see their scores, correct answers, and feedback.')}
                </p>
                <Button
                  onClick={() => setShowConfirm(true)}
                  disabled={!selectedClassId || releaseMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <Icon name="send" size={16} className="mr-1" />
                  {_('Release')} {_(selectedOption.label)}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {!selectedClassId && (
          <div>
            <Card className="border-border/60">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Icon name="send" size={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-body-md">{_('Select a class to release grades')}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{_('Release Grades')}</DialogTitle>
              <DialogDescription>
                {_('Are you sure you want to release')} {selectedOption.label.toLowerCase()} {_('results? This action cannot be undone.')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={releaseMutation.isPending}>
                {_('Cancel')}
              </Button>
              <Button onClick={() => releaseMutation.mutate()} disabled={releaseMutation.isPending}>
                {releaseMutation.isPending ? _('Releasing...') : _('Confirm Release')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
