import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cardStackReveal } from '@/lib/motion';
import { RubricGenerator } from '@/components/nep-questions/RubricGenerator';
import { getRubrics } from '@/services/nepQuestionsService';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

export default function TeacherRubricPage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [showGenerator, setShowGenerator] = useState(false);

  const { data: rubrics, isLoading, error, refetch } = useQuery({
    queryKey: ['rubrics'],
    queryFn: () => getRubrics(),
  });

  const { data: assignmentsData } = useQuery({
    queryKey: ['assignments-for-rubrics'],
    queryFn: () => api.get('/assignments-v2').then((r) => r.data.data),
  });

  const assignments = (assignmentsData?.items || assignmentsData || []).map((a: any) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    totalMarks: a.totalMarks || a.points || 20,
  }));

  return (
    <>
      <SEOHead title={_('Rubric Manager')} description={_('Create and manage AI-generated grading rubrics')} canonical="/teacher/rubrics" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-6"
      >
        <motion.div variants={cardStackReveal} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-headline-sm">{_('Rubric Manager')}</h1>
            <p className="text-body-md text-muted-foreground">{_('AI-generated grading rubrics for assignments')}</p>
          </div>
          <Button onClick={() => setShowGenerator(true)}>
            <Icon name="add" size={16} className="mr-1" />{_('Create Rubric')}
          </Button>
        </motion.div>

        <motion.div variants={cardStackReveal}>
          <DataFetchWrapper data={rubrics} isLoading={isLoading} error={error} onRetry={() => refetch()} loadingType="list">
            {() => (
              <div className="space-y-3">
                {(!rubrics || rubrics.length === 0) ? (
                  <Card className="border-border/60">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Icon name="menu_book" size={48} className="mx-auto mb-3 opacity-40" />
                      <p className="text-body-md">{_('No rubrics yet. Create your first AI-generated rubric!')}</p>
                    </CardContent>
                  </Card>
                ) : (
                  rubrics.map((r) => (
                    <Card key={r.id} className="border-border/60">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="bg-primary/10 text-primary">{r.criteria.length} criteria</Badge>
                              <Badge variant="outline" className="bg-amber-100 text-amber-800">{r.totalMarks} marks</Badge>
                            </div>
                            <p className="text-title-sm font-medium">{r.title}</p>
                            <p className="text-label-sm text-muted-foreground mt-1">
                              Assignment: {r.assignmentId?.slice(0, 8)}... · Generated: {new Date(r.createdAt || r.generatedAt).toLocaleDateString()}
                            </p>
                            {r.criteria && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {r.criteria.map((c: any, i: number) => (
                                  <Badge key={i} variant="outline" className="text-label-xs">
                                    {c.name} ({c.maxMarks}pts)
                                  </Badge>
                                ))}
                              </div>
                            )}
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

        <Dialog open={showGenerator} onOpenChange={(o) => { if (!o) setShowGenerator(false); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{_('Create AI Rubric')}</DialogTitle>
              <DialogDescription>{_('Select an assignment and generate a grading rubric with AI.')}</DialogDescription>
            </DialogHeader>
            <RubricGenerator
              assignments={assignments}
              onRubricSaved={() => { setShowGenerator(false); queryClient.invalidateQueries({ queryKey: ['rubrics'] }); }}
            />
          </DialogContent>
        </Dialog>
      </motion.div>
    </>
  );
}
