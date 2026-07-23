import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { ReleaseRepublishModal } from '@/components/common/ReleaseRepublishModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

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

  const uniqueSubjects = useMemo(() => {
    const map = new Map<string, string>();
    assignmentList.forEach(a => { if (!map.has(a.subjectId)) map.set(a.subjectId, a.subjectName); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [assignmentList]);

  const subjectMap = useMemo(() => {
    const m = new Map<string, string>();
    assignmentList.forEach(a => m.set(a.subjectId, a.subjectName));
    return m;
  }, [assignmentList]);

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

  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    type: 'release' | 'republish';
    assessmentType: 'exam' | 'quiz' | 'assignment';
    id: string;
    title: string;
  } | null>(null);

  function onError(msg: string) {
    return (err: unknown) => {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : msg;
      toast.error(message);
    };
  }

  const toggleGradesMutation = useMutation({
    mutationFn: (examId: string) => api.put(`/exams-v2/${examId}/grades`),
    onSuccess: () => {
      toast.success(_('Grades visibility updated'));
      queryClient.invalidateQueries({ queryKey: ['exams-v2-class'] });
    },
    onError: onError(_('Failed to update grades visibility')),
  });

  const toggleQuizGradesMutation = useMutation({
    mutationFn: ({ id, showResults }: { id: string; showResults: boolean }) =>
      api.put(`/quizzes-v2/${id}/grades`, { showResults }).then((r) => r.data.data),
    onSuccess: () => {
      toast.success(_('Grades visibility updated'));
      queryClient.invalidateQueries({ queryKey: ['quizzes-v2-class', selectedClassId] });
    },
    onError: onError(_('Failed to update grades visibility')),
  });

  const releaseWithGradesMutation = useMutation({
    mutationFn: async ({
      type, id, showResults, action,
    }: {
      type: 'exam' | 'quiz' | 'assignment';
      id: string;
      showResults: boolean;
      action: 'release' | 'republish';
    }) => {
      if (action === 'release') {
        if (type === 'exam') await api.post(`/exams-v2/${id}/release`);
        else if (type === 'quiz') await api.post(`/quizzes-v2/${id}/release`);
        else await api.post(`/assignments-v2/${id}/release`);
      } else {
        await api.post(`/quizzes-v2/${id}/republish`);
      }
      await api.put(`/${type === 'exam' ? 'exams-v2' : type === 'quiz' ? 'quizzes-v2' : 'assignments-v2'}/${id}/grades`, { showResults });
    },
    onSuccess: (_data, vars) => {
      const actionLabel = vars.action === 'republish' ? _('Republished') : _('Released');
      const typeLabel = vars.type === 'exam' ? _('Exam') : vars.type === 'quiz' ? _('Quiz') : _('Assignment');
      toast.success(`${typeLabel} ${actionLabel}`);
      const key = vars.type === 'exam' ? 'exams-v2-class' : vars.type === 'quiz' ? 'quizzes-v2-class' : 'assignments-v2-class';
      queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: onError(_('Failed to complete action')),
  });

  const examList: any[] = exams ?? [];
  const quizList: any[] = quizzes ?? [];
  const assignmentItems: any[] = assignmentsData ?? [];

  const filteredExamList = useMemo(() => {
    if (!searchQuery && !subjectFilter) return examList;
    return examList.filter((e: any) => {
      const matchTitle = !searchQuery || (e.title || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchSubject = !subjectFilter || e.subjectId === subjectFilter || e.subject_id === subjectFilter;
      return matchTitle && matchSubject;
    });
  }, [examList, searchQuery, subjectFilter]);

  const filteredQuizList = useMemo(() => {
    if (!searchQuery) return quizList;
    return quizList.filter((q: any) => (q.title || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [quizList, searchQuery]);

  const filteredAssignmentList = useMemo(() => {
    if (!searchQuery) return assignmentItems;
    return assignmentItems.filter((a: any) => (a.title || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [assignmentItems, searchQuery]);

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
          <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={_('Search by title...')}
                className="pl-10"
              />
            </div>
            {activeTab === 'exams' && (
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">{_('All Subjects')}</option>
                {uniqueSubjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>
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
                    {(filteredExamList.length > 0 ? filteredExamList : examList).map((exam: any) => (
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
                                <Button size="sm" onClick={() => { setModalConfig({ type: 'release', assessmentType: 'exam', id: exam.id, title: exam.title }); setModalOpen(true); }} className="gap-1">
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
                    {(filteredQuizList.length > 0 ? filteredQuizList : quizList).map((quiz: any) => {
                      const isDraft = !quiz.releasedAt;
                      const isReleased = !!quiz.releasedAt && !quiz.isRepublished;
                      const isRepublished = !!quiz.releasedAt && !!quiz.isRepublished;
                      return (
                      <Card key={quiz.id} className="border-border/60">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${isReleased || isRepublished ? 'bg-success-container' : 'bg-secondary-container'}`}>
                              <Icon name="quiz" size={20} className={isReleased || isRepublished ? 'text-on-success-container' : 'text-on-secondary-container'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-semibold truncate">{quiz.title}</p>
                                <Badge variant={isRepublished ? 'success' : isReleased ? 'success' : 'secondary'} className="text-[10px] shrink-0 capitalize">
                                  {isRepublished ? _('Republished') : isReleased ? _('Released') : _('Draft')}
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
                            <div className="flex items-center gap-2 shrink-0">
                              {isDraft && (
                                <Button size="sm" onClick={() => { setModalConfig({ type: 'release', assessmentType: 'quiz', id: quiz.id, title: quiz.title }); setModalOpen(true); }} className="gap-1">
                                  <Icon name="publish" size={15} />{_('Release')}
                                </Button>
                              )}
                              {isReleased && (
                                <Button size="sm" variant="outline" onClick={() => { setModalConfig({ type: 'republish', assessmentType: 'quiz', id: quiz.id, title: quiz.title }); setModalOpen(true); }} className="gap-1">
                                  <Icon name="autorenew" size={15} />{_('Republish')}
                                </Button>
                              )}
                              {isRepublished && (
                                <div className="flex items-center gap-2">
                                  <span className="text-label-xs text-muted-foreground">{_('Grades')}</span>
                                  <Switch checked={quiz.showResults} onCheckedChange={(checked) => toggleQuizGradesMutation.mutate({ id: quiz.id, showResults: checked })} disabled={toggleQuizGradesMutation.isPending && toggleQuizGradesMutation.variables?.id === quiz.id} />
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      );
                    })}
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
                    {(filteredAssignmentList.length > 0 ? filteredAssignmentList : assignmentItems).map((as: any) => (
                      <Card key={as.id} className="border-border/60">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${as.releasedAt ? 'bg-success-container' : 'bg-secondary-container'}`}>
                              <Icon name="assignment" size={20} className={as.releasedAt ? 'text-on-success-container' : 'text-on-secondary-container'} />
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
                            <div className="flex items-center gap-2 shrink-0">
                              {!as.releasedAt && (
                                <Button size="sm" onClick={() => { setModalConfig({ type: 'release', assessmentType: 'assignment', id: as.id, title: as.title }); setModalOpen(true); }} className="gap-1">
                                  <Icon name="publish" size={15} />{_('Release')}
                                </Button>
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
          </Tabs>
          </>
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

      {modalConfig && (
        <ReleaseRepublishModal
          open={modalOpen}
          onOpenChange={(open) => { setModalOpen(open); if (!open) setModalConfig(null); }}
          type={modalConfig.type}
          assessmentType={modalConfig.assessmentType}
          title={modalConfig.title}
          onConfirm={(showResults) => {
            releaseWithGradesMutation.mutate({
              type: modalConfig.assessmentType,
              id: modalConfig.id,
              showResults,
              action: modalConfig.type,
            });
            setModalConfig(null);
          }}
          loading={releaseWithGradesMutation.isPending}
        />
      )}
    </>
  );
}
