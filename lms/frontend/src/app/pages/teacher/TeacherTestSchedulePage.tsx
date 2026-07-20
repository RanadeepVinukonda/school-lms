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
import { Switch } from '@/components/ui/switch';
import { Icon } from '@/components/ui/Icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cardStackReveal } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';

interface TeacherAssignment {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
}

export default function TeacherTestSchedulePage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const teacherId = user?.id ?? '';
  const queryClient = useQueryClient();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [activeTab, setActiveTab] = useState('exams');

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['teacher-assignments', user?.id],
    queryFn: () => api.get('/teacher-class-subject/my').then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const assignmentList: TeacherAssignment[] = assignments ?? [];
  const uniqueClasses = assignmentList.reduce<TeacherAssignment[]>((acc, a) => {
    if (!acc.find((x) => x.classId === a.classId)) acc.push(a);
    return acc;
  }, []);

  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ['exams-v2-class', selectedClassId],
    queryFn: () => api.get(`/exams-v2/class/${selectedClassId}`).then((r) => r.data.data),
    enabled: !!selectedClassId,
  });

  const { data: quizzes, isLoading: quizzesLoading } = useQuery({
    queryKey: ['quizzes-v2-class', selectedClassId],
    queryFn: () => api.get(`/quizzes-v2/class/${selectedClassId}`).then((r) => r.data.data),
    enabled: !!selectedClassId,
  });

  const { data: assignmentsData, isLoading: assignmentsDataLoading } = useQuery({
    queryKey: ['assignments-v2-class', selectedClassId],
    queryFn: () => api.get(`/assignments-v2/class/${selectedClassId}`).then((r) => r.data.data),
    enabled: !!selectedClassId,
  });

  const releaseMutation = useMutation({
    mutationFn: (examId: string) => api.post(`/exams-v2/${examId}/release`),
    onSuccess: () => {
      toast.success(_('Exam released to students'));
      queryClient.invalidateQueries({ queryKey: ['exams-v2-class'] });
    },
    onError: () => toast.error(_('Failed to release exam')),
  });

  const toggleGradesMutation = useMutation({
    mutationFn: (examId: string) => api.put(`/exams-v2/${examId}/grades`),
    onSuccess: () => {
      toast.success(_('Grades visibility updated'));
      queryClient.invalidateQueries({ queryKey: ['exams-v2-class'] });
    },
    onError: () => toast.error(_('Failed to update grades visibility')),
  });

  const examList: any[] = exams ?? [];
  const quizList: any[] = quizzes ?? [];
  const assignmentItems: any[] = assignmentsData ?? [];

  function formatDate(d: string) {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString(); } catch { return d; }
  }

  return (
    <>
      <SEOHead title={_('Manage Tests & Review')} description={_('Review all exams, quizzes and assignments by class')} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto space-y-8 pb-32"
      >
        <motion.div variants={cardStackReveal} custom={0}>
          <h1 className="text-headline-sm">{_('Manage Tests & Review')}</h1>
          <p className="text-body-md text-muted-foreground mt-1">
            {_('View all created exams, quizzes, and assignments by class')}
          </p>
        </motion.div>

        {/* Class Selector */}
        <motion.div variants={cardStackReveal} custom={1}>
          <Card className="border-border/60">
            <CardContent className="p-5">
              <label className="text-sm font-medium">{_('Select Class')}</label>
              <select
                value={selectedClassId}
                onChange={(e) => { setSelectedClassId(e.target.value); setActiveTab('exams'); }}
                disabled={assignmentsLoading}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">{_('Choose a class...')}</option>
                {uniqueClasses.map((a) => (
                  <option key={a.classId} value={a.classId}>{a.className}</option>
                ))}
              </select>
            </CardContent>
          </Card>
        </motion.div>

        {selectedClassId && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full overflow-x-auto inline-flex">
              <TabsTrigger value="exams" className="gap-2">
                <Icon name="fact_check" size={16} />
                {_('Exams')}
                {examList.length > 0 && <Badge variant="secondary" className="ml-1 text-label-xs px-1.5">{examList.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="quizzes" className="gap-2">
                <Icon name="quiz" size={16} />
                {_('Quizzes')}
                {quizList.length > 0 && <Badge variant="secondary" className="ml-1 text-label-xs px-1.5">{quizList.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="assignments" className="gap-2">
                <Icon name="assignment" size={16} />
                {_('Assignments')}
                {assignmentItems.length > 0 && <Badge variant="secondary" className="ml-1 text-label-xs px-1.5">{assignmentItems.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="exams" className="mt-6">
              <DataFetchWrapper
                data={exams}
                isLoading={examsLoading}
                error={null}
                loadingType="list"
                emptyMessage={_('No exams created for this class')}
                emptyIcon={<Icon name="fact_check" size={40} className="text-muted-foreground/50" />}
              >
                {() => (
                  <div className="space-y-3">
                    {examList.map((exam: any) => (
                      <Card key={exam.id} className="border-border/60">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${exam.releasedAt ? 'bg-success-container' : 'bg-secondary-container'}`}>
                              <Icon name="fact_check" size={20} className={exam.releasedAt ? 'text-on-success-container' : 'text-on-secondary-container'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-semibold truncate">{exam.title}</p>
                                <Badge variant={exam.releasedAt ? 'success' : 'secondary'} className="text-[10px] shrink-0 capitalize">
                                  {exam.releasedAt ? _('Released') : _('Draft')}
                                </Badge>
                              </div>
                              <p className="text-label-xs text-muted-foreground line-clamp-1">{exam.description}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-label-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Icon name="schedule" size={14} />{exam.timeLimitMinutes} {_('min')}</span>
                                <span className="flex items-center gap-1"><Icon name="percent" size={14} />{_('Pass')}: {exam.passingScore}%</span>
                                <span className="flex items-center gap-1"><Icon name="people" size={14} />{exam.attemptCount ?? 0} {_('attempts')}</span>
                                <span>{formatDate(exam.createdAt)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {!exam.releasedAt && (
                                <Button size="sm" onClick={() => releaseMutation.mutate(exam.id)} loading={releaseMutation.isPending && releaseMutation.variables === exam.id} className="gap-1">
                                  <Icon name="publish" size={15} />{_('Release')}
                                </Button>
                              )}
                              {exam.releasedAt && (
                                <div className="flex items-center gap-2">
                                  <span className="text-label-xs text-muted-foreground">{_('Grades')}</span>
                                  <Switch checked={exam.showResults} onCheckedChange={() => toggleGradesMutation.mutate(exam.id)} disabled={toggleGradesMutation.isPending && toggleGradesMutation.variables === exam.id} />
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </DataFetchWrapper>
            </TabsContent>

            <TabsContent value="quizzes" className="mt-6">
              <DataFetchWrapper
                data={quizzes}
                isLoading={quizzesLoading}
                error={null}
                loadingType="list"
                emptyMessage={_('No quizzes created for this class')}
                emptyIcon={<Icon name="quiz" size={40} className="text-muted-foreground/50" />}
              >
                {() => (
                  <div className="space-y-3">
                    {quizList.map((quiz: any) => (
                      <Card key={quiz.id} className="border-border/60">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-lg bg-secondary-container flex items-center justify-center shrink-0">
                              <Icon name="quiz" size={20} className="text-on-secondary-container" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-semibold truncate">{quiz.title}</p>
                                <Badge variant={quiz.releasedAt ? 'success' : 'secondary'} className="text-[10px] shrink-0 capitalize">
                                  {quiz.releasedAt ? _('Released') : _('Draft')}
                                </Badge>
                              </div>
                              <p className="text-label-xs text-muted-foreground line-clamp-1">{quiz.description}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-label-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Icon name="schedule" size={14} />{quiz.timeLimitMinutes || quiz.durationMinutes || '-'} {_('min')}</span>
                                <span className="flex items-center gap-1"><Icon name="percent" size={14} />{_('Pass')}: {quiz.passingScore}%</span>
                                <span className="flex items-center gap-1"><Icon name="people" size={14} />{quiz.attemptCount ?? 0} {_('attempts')}</span>
                                <span>{formatDate(quiz.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </DataFetchWrapper>
            </TabsContent>

            <TabsContent value="assignments" className="mt-6">
              <DataFetchWrapper
                data={assignmentsData}
                isLoading={assignmentsDataLoading}
                error={null}
                loadingType="list"
                emptyMessage={_('No assignments created for this class')}
                emptyIcon={<Icon name="assignment" size={40} className="text-muted-foreground/50" />}
              >
                {() => (
                  <div className="space-y-3">
                    {assignmentItems.map((as: any) => (
                      <Card key={as.id} className="border-border/60">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-lg bg-secondary-container flex items-center justify-center shrink-0">
                              <Icon name="assignment" size={20} className="text-on-secondary-container" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-semibold truncate">{as.title}</p>
                                <Badge variant={as.releasedAt ? 'success' : 'secondary'} className="text-[10px] shrink-0 capitalize">
                                  {as.releasedAt ? _('Released') : _('Draft')}
                                </Badge>
                              </div>
                              <p className="text-label-xs text-muted-foreground line-clamp-1">{as.description}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-label-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Icon name="calendar_today" size={14} />{formatDate(as.dueDate || as.due_date)}</span>
                                <span className="flex items-center gap-1"><Icon name="people" size={14} />{as.submissionCount ?? as.attemptCount ?? 0} {_('submissions')}</span>
                                <span>{formatDate(as.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </DataFetchWrapper>
            </TabsContent>
          </Tabs>
        )}

        {!selectedClassId && (
          <Card className="border-border/60">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Icon name="school" size={48} className="mx-auto mb-3 opacity-40" />
              <p>{_('Select a class to view tests and assignments')}</p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </>
  );
}
