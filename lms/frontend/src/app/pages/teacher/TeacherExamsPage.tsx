import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/skeleton';
import { cardStackReveal } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { getTextbooksBySubject, getChaptersForTextbook } from '@/services/textbookService';
import type { Textbook, Chapter } from '@/types/textbook';

interface TeacherAssignment {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
}

const QUESTION_MODEL_OPTIONS = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'matching', label: 'Matching' },
];

export default function TeacherExamsPage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const teacherId = user?.id ?? '';
  const queryClient = useQueryClient();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTextbookId, setSelectedTextbookId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('60');
  const [selectedModels, setSelectedModels] = useState<string[]>(['multiple_choice', 'true_false']);
  const [questionCount, setQuestionCount] = useState('10');
  const [passingScore, setPassingScore] = useState('50');
  const [maxAttempts, setMaxAttempts] = useState('1');

  const EXAM_TYPE_MAP: Record<string, string[]> = { multiple_choice: ['mcq', 'multiple_choice'] };

  const [distribution, setDistribution] = useState<Record<string, Record<string, number>>>({
    easy: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
    medium: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
    hard: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
    hots: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
  });

  useEffect(() => {
    if (selectedModels.length === 0 || Number(questionCount) === 0) {
      const empty = { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 };
      setDistribution({ easy: { ...empty }, medium: { ...empty }, hard: { ...empty }, hots: { ...empty } });
      return;
    }
    const backendTypes = selectedModels.map((m: string) => (EXAM_TYPE_MAP[m] || [m])[0]);
    const numTypes = backendTypes.length;
    const numDiffs = 4;
    const totalCells = numTypes * numDiffs;
    const qc = Number(questionCount);
    const perCell = Math.floor(qc / totalCells);
    let remainder = qc - perCell * totalCells;
    const newDist: Record<string, Record<string, number>> = { easy: {}, medium: {}, hard: {}, hots: {} };
    for (const d of ['easy', 'medium', 'hard', 'hots']) {
      for (const bt of backendTypes) {
        let val = perCell;
        if (remainder > 0) { val += 1; remainder -= 1; }
        newDist[d][bt] = val;
      }
    }
    for (const d of ['easy', 'medium', 'hard', 'hots']) {
      for (const bt of backendTypes) {
        if (newDist[d][bt] === undefined) newDist[d][bt] = 0;
      }
    }
    setDistribution(newDist);
  }, [questionCount, selectedModels]);

  const [reviewQuestions, setReviewQuestions] = useState<any[]>([]);

  const { data: assignments, isLoading: assignmentsLoading, error: assignmentsError } = useQuery({
    queryKey: ['teacher-assignments', user?.id],
    queryFn: () => api.get('/teacher-class-subject/my').then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const assignmentList: TeacherAssignment[] = assignments ?? [];
  const classAssignments = assignmentList.filter((a) => a.classId === selectedClassId);
  const effectiveSubjectId = selectedSubjectId || classAssignments[0]?.subjectId || '';
  const selectedAssignment = classAssignments.find((a) => a.subjectId === effectiveSubjectId);

  useEffect(() => {
    if (classAssignments.length > 0) {
      setSelectedSubjectId(classAssignments[0].subjectId);
    } else {
      setSelectedSubjectId('');
    }
  }, [selectedClassId, classAssignments]);

  const { data: textbooks = [], isLoading: textbooksLoading } = useQuery({
    queryKey: ['textbooks-by-subject', selectedAssignment?.subjectId],
    queryFn: () => getTextbooksBySubject(selectedAssignment!.subjectId),
    enabled: !!selectedAssignment?.subjectId,
  });

  const { data: chapters = [], isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters-for-textbook', selectedTextbookId],
    queryFn: () => getChaptersForTextbook(selectedTextbookId),
    enabled: !!selectedTextbookId,
  });

  const { data: availableTypes = [] } = useQuery({
    queryKey: ['available-question-types', selectedTextbookId, selectedChapterId],
    queryFn: () => api.get(`/exams-v2/chapter/${selectedTextbookId}/${selectedChapterId}/types`).then((r) => r.data.data),
    enabled: !!selectedTextbookId && !!selectedChapterId,
  });

  useEffect(() => {
    if (availableTypes.length > 0) {
      setSelectedModels(availableTypes);
    }
  }, [availableTypes]);

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      try {
        const res = await api.post('/exams-v2', body);
        return res.data.data;
      } catch (err: unknown) {
        const axErr = err as { response?: { data?: { error?: { message?: string; details?: unknown } }; status?: number }; message?: string };
        console.log('RAW_CREATE_ERR', 'response:', JSON.stringify(axErr?.response?.data?.error), 'msg:', axErr?.message);
        throw err;
      }
    },
    onSuccess: () => {
      toast.success(_('Exam created successfully'));
      setTitle('');
      setDescription('');
      setTimeLimitMinutes('60');
      setSelectedModels(['multiple_choice', 'true_false']);
      setQuestionCount('10');
      setPassingScore('50');
      setMaxAttempts('1');
      setReviewQuestions([]);
      const empty = { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 };
      setDistribution({ easy: { ...empty }, medium: { ...empty }, hard: { ...empty }, hots: { ...empty } });
    },
    onError: (err: unknown) => {
      console.log('CREATE_ERR keys:', Object.keys(err as object));
      console.log('CREATE_ERR full:', err);
      const obj = err as Record<string, unknown>;
      const raw = JSON.stringify(obj).substring(0, 800);
      toast.error('ERR: ' + raw);
    },
  });

  const generatePreviewMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.post('/exams-v2', body);
      return res.data.data;
    },
    onSuccess: (data) => {
      if (data.questions?.length) {
        setReviewQuestions(data.questions);
        toast.success(data.questions.length + ' ' + _('questions') + ' ' + _('loaded'));
      } else {
        toast.error(_('No questions found for this chapter'));
      }
    },
    onError: (err: unknown) => {
      console.log('PREVIEW_ERR', err);
      const e = err as { message: string; details?: Array<{ field: string; message: string }> };
      let message = e?.message || _('Failed to generate preview');
      if (e?.details?.length) {
        message += ': ' + e.details.map((d) => d.field + ' ' + d.message).join(', ');
      }
      toast.error(message);
    },
  });

  function handleToggleModel(model: string) {
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model],
    );
  }

  function canCreate(): boolean {
    return (
      !!title.trim() &&
      !!selectedClassId &&
      !!selectedTextbookId &&
      !!selectedChapterId &&
      selectedModels.length > 0 &&
      Number(timeLimitMinutes) > 0 &&
      Number(questionCount) > 0 &&
      Number(passingScore) >= 0 &&
      Number(maxAttempts) > 0 &&
      !createMutation.isPending
    );
  }

  function handleCreate() {
    if (!canCreate()) return;
    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description || '',
      classId: selectedClassId,
      subjectId: selectedAssignment?.subjectId || '',
      textbookId: selectedTextbookId,
      chapterId: selectedChapterId,
      teacherId,
      timeLimitMinutes: Number(timeLimitMinutes),
      selectedModels: [...selectedModels],
      questionCount: Number(questionCount),
      passingScore: Number(passingScore),
      maxAttempts: Number(maxAttempts),
      distribution,
      shuffleQuestions: true,
      showResults: true,
    };
    if (reviewQuestions.length > 0) {
      (body as any).questions = reviewQuestions;
    }
    createMutation.mutate(body);
  }

  function handleGeneratePreview() {
    if (!selectedClassId || !selectedTextbookId || !selectedChapterId) return;
    generatePreviewMutation.mutate({
      title: title.trim() || 'Preview',
      description: description || '',
      classId: selectedClassId,
      subjectId: selectedAssignment?.subjectId || '',
      textbookId: selectedTextbookId,
      chapterId: selectedChapterId,
      teacherId,
      timeLimitMinutes: Number(timeLimitMinutes),
      selectedModels: [...selectedModels],
      questionCount: Number(questionCount),
      distribution,
      preview: true,
    });
  }

  if (assignmentsLoading) {
    return (
      <div className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-16">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (assignmentsError) {
    return (
      <div className="sm:p-6 p-4 max-w-4xl mx-auto pb-32">
        <Card className="border-border/60">
          <CardContent className="p-5 text-center space-y-4">
            <Icon name="error" size={48} className="text-destructive mx-auto" />
            <p className="text-muted-foreground">{_('Failed to load your class assignments.')}</p>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['teacher-assignments', user?.id] })}>
              <Icon name="refresh" size={16} className="mr-1" />
              {_('Retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!assignmentList || assignmentList.length === 0) {
    return (
      <div className="sm:p-6 p-4 max-w-4xl mx-auto pb-32">
        <Card className="border-border/60">
          <CardContent className="p-5 text-center space-y-4">
            <Icon name="school" size={48} className="text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              {_('You haven\'t been assigned to any class yet. Contact your administrator to get started.')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const uniqueClasses = assignmentList.reduce<TeacherAssignment[]>((acc, a) => {
    if (!acc.find((x) => x.classId === a.classId)) acc.push(a);
    return acc;
  }, []);

  return (
    <>
      <SEOHead title={_('Exams')} description={_('Create chapter-level exams')} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-16"
      >
        <motion.div variants={cardStackReveal} custom={0}>
          <h1 className="text-headline-sm">{_('Exams')}</h1>
          <p className="text-body-md text-muted-foreground">
            {_('Create chapter-level exams from all concepts in a chapter')}
          </p>
        </motion.div>

        <motion.div variants={cardStackReveal} custom={1} className="space-y-6">
          {/* Class & Subject Selection */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-title-sm">{_('Teacher Assignment')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="class-select">{_('Class')}</Label>
                <select
                  id="class-select"
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedSubjectId('');
                    setSelectedTextbookId('');
                    setSelectedChapterId('');
                    setReviewQuestions([]);
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">{_('Select a class...')}</option>
                  {uniqueClasses.map((a) => (
                    <option key={a.classId} value={a.classId}>
                      {a.className}
                    </option>
                  ))}
                </select>
              </div>

              {selectedClassId && classAssignments.length > 1 && (
                <div>
                  <Label htmlFor="subject-select">{_('Subject')}</Label>
                  <select
                    id="subject-select"
                    value={effectiveSubjectId}
                    onChange={(e) => {
                      setSelectedSubjectId(e.target.value);
                      setSelectedTextbookId('');
                      setSelectedChapterId('');
                      setReviewQuestions([]);
                    }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {classAssignments.map((a) => (
                      <option key={a.subjectId} value={a.subjectId}>
                        {a.subjectName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedAssignment && (
                <div>
                  <Label htmlFor="textbook-select">{_('Textbook')}</Label>
                  <select
                    id="textbook-select"
                    value={selectedTextbookId}
                    onChange={(e) => {
                      setSelectedTextbookId(e.target.value);
                      setSelectedChapterId('');
                      setReviewQuestions([]);
                    }}
                    disabled={!selectedAssignment || textbooksLoading}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{_('Select a textbook...')}</option>
                    {textbooks.map((tb: Textbook) => (
                      <option key={tb.id} value={tb.id}>
                        {tb.title || tb.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedTextbookId && (
                <div>
                  <Label htmlFor="chapter-select">{_('Chapter')}</Label>
                  <select
                    id="chapter-select"
                    value={selectedChapterId}
                    onChange={(e) => {
                      setSelectedChapterId(e.target.value);
                      setReviewQuestions([]);
                    }}
                    disabled={chaptersLoading}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{_('Select a chapter...')}</option>
                    {chapters.map((ch: Chapter) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.title || ch.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exam Details */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-title-sm">{_('Exam Details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="exam-title">{_('Title')}</Label>
                <Input
                  id="exam-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={_('Enter exam title')}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="exam-desc">{_('Description')}</Label>
                <Textarea
                  id="exam-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={_('Brief description of the exam')}
                  className="mt-1.5"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="time-limit">{_('Time Limit (minutes)')}</Label>
                  <Input
                    id="time-limit"
                    type="number"
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(e.target.value)}
                    className="mt-1.5"
                    min={1}
                  />
                </div>
                <div>
                  <Label htmlFor="questions-per-concept">{_('Total Questions')}</Label>
                  <Input
                    id="questions-per-concept"
                    type="number"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(e.target.value)}
                    className="mt-1.5"
                    min={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="passing-score">{_('Passing Score (%)')}</Label>
                  <Input
                    id="passing-score"
                    type="number"
                    value={passingScore}
                    onChange={(e) => setPassingScore(e.target.value)}
                    className="mt-1.5"
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <Label htmlFor="max-attempts">{_('Max Attempts')}</Label>
                  <Input
                    id="max-attempts"
                    type="number"
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(e.target.value)}
                    className="mt-1.5"
                    min={1}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Question Models */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-title-sm">{_('Question Models')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {QUESTION_MODEL_OPTIONS.map((model) => (
                  <label
                    key={model.value}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                      selectedModels.includes(model.value)
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-background hover:border-border/80'
                    }`}
                  >
                    <Checkbox
                      checked={selectedModels.includes(model.value)}
                      onCheckedChange={() => handleToggleModel(model.value)}
                    />
                    <span className="text-sm whitespace-nowrap">{model.label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Difficulty Distribution */}
          {selectedModels.length > 0 && Number(questionCount) > 0 && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-title-sm">{_('Question Distribution')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const activeTypes = QUESTION_MODEL_OPTIONS.filter(m => selectedModels.includes(m.value));
                  const distTotal = Object.values(distribution).reduce(
                    (sum: number, types: Record<string, number>) => sum + Object.values(types).reduce((s: number, v: number) => s + v, 0), 0,
                  );
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {_('Auto-distributed equally across difficulties. Adjust cells manually as needed.')}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className={`text-xs font-semibold ${distTotal !== Number(questionCount) ? 'text-destructive' : ''}`}>
                            Total: {distTotal} / {questionCount} {_('questions')}
                          </p>
                          {distTotal !== Number(questionCount) && selectedModels.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (selectedModels.length === 0 || Number(questionCount) === 0) return;
                                const backendTypes = selectedModels.map((m: string) => (EXAM_TYPE_MAP[m] || [m])[0]);
                                const numTypes = backendTypes.length;
                                const totalCells = numTypes * 4;
                                const perCell = Math.floor(Number(questionCount) / totalCells);
                                let rem = Number(questionCount) - perCell * totalCells;
                                const newDist: Record<string, Record<string, number>> = { easy: {}, medium: {}, hard: {}, hots: {} };
                                for (const d of ['easy', 'medium', 'hard', 'hots']) {
                                  for (const bt of backendTypes) {
                                    let val = perCell;
                                    if (rem > 0) { val += 1; rem -= 1; }
                                    newDist[d][bt] = val;
                                  }
                                }
                                setDistribution(newDist);
                              }}
                              className="gap-1 h-6 text-[10px]"
                            >
                              <Icon name="sync" size={12} />
                              Sync
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border/60">
                              <th className="text-left py-2 pr-3">{_('Difficulty')}</th>
                              {activeTypes.map((m) => (
                                <th key={m.value} className="text-center px-2 py-2">{m.label}</th>
                              ))}
                              <th className="text-center px-2 py-2">{_('Total')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {['easy', 'medium', 'hard', 'hots'].map((diff) => (
                              <tr key={diff} className="border-b border-border/40">
                                <td className={`py-2 pr-3 font-medium capitalize ${diff === 'hots' ? 'text-purple-600' : ''}`}>{diff}</td>
                                {activeTypes.map((m) => {
                                  const mappedType = m.value === 'multiple_choice' ? 'mcq' : m.value;
                                  return (
                                    <td key={m.value} className="text-center px-1 py-1">
                                      <input
                                        type="number"
                                        min={0}
                                        value={distribution[diff]?.[mappedType] ?? 0}
                                        onChange={(e) => {
                                          const newDist = { ...distribution };
                                          newDist[diff] = { ...newDist[diff], [mappedType]: parseInt(e.target.value) || 0 };
                                          setDistribution(newDist);
                                        }}
                                        className="w-14 text-center rounded border border-border bg-background px-1 py-1 text-xs"
                                      />
                                    </td>
                                  );
                                })}
                                <td className="text-center px-2 py-2 font-semibold">
                                  {activeTypes.reduce((sum, m) => {
                                    const t = m.value === 'multiple_choice' ? 'mcq' : m.value;
                                    return sum + (distribution[diff]?.[t] ?? 0);
                                  }, 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Preview & Create */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {selectedChapterId && (
              <Button
                onClick={handleGeneratePreview}
                disabled={generatePreviewMutation.isPending || !selectedChapterId}
                variant="outline"
                className="gap-2"
              >
                {generatePreviewMutation.isPending ? (
                  <><span className="animate-spin">⟳</span> {_('Generating...')}</>
                ) : (
                  <><Icon name="visibility" size={16} /> {_('Generate Preview')} ({questionCount} {_('questions')})</>
                )}
              </Button>
            )}

            <Button
              onClick={handleCreate}
              disabled={!canCreate()}
              className="gap-2"
            >
              <Icon name="add" size={16} />
              {_('Create Exam')}
            </Button>
          </div>

          {/* Editable Preview */}
          {reviewQuestions.length > 0 && (
            <Card className="border-border/60">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-title-sm">
                  {_('All Questions')} — {reviewQuestions.length} {_('total')}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setReviewQuestions([])}>
                  <Icon name="close" size={16} />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {reviewQuestions.map((q: any, i: number) => (
                  <Card key={q.id || i} className="border-border/40 bg-muted/30">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-label-xs text-muted-foreground shrink-0 mt-1">
                          Q{i + 1}
                        </span>
                        <input
                          className="flex-1 bg-background text-foreground border border-border rounded px-2 py-1 text-sm"
                          value={q.text || q.question || ''}
                          onChange={(e) => {
                            const updated = [...reviewQuestions];
                            updated[i] = { ...updated[i], text: e.target.value, question: e.target.value };
                            setReviewQuestions(updated);
                          }}
                        />
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {q.type || 'mcq'}
                        </Badge>
                      </div>

                      {q.options && q.options.length > 0 && (
                        <div className="space-y-1.5 pl-6">
                          {q.options.map((opt: string, oi: number) => (
                            <div key={oi} className="flex items-center gap-2">
                              <span className="text-label-xs text-muted-foreground w-4">{String.fromCharCode(65 + oi)}.</span>
                              <input
                                className="flex-1 bg-background text-foreground border border-border rounded px-2 py-1 text-sm"
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...reviewQuestions];
                                  const opts = [...(updated[i].options || [])];
                                  opts[oi] = e.target.value;
                                  updated[i] = { ...updated[i], options: opts };
                                  setReviewQuestions(updated);
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 pl-6">
                        <div className="flex items-center gap-2">
                          <span className="text-label-xs text-muted-foreground">{_('Points')}:</span>
                          <input
                            type="number"
                            className="w-16 bg-background text-foreground border border-border rounded px-2 py-1 text-sm"
                            value={q.points ?? 1}
                            onChange={(e) => {
                              const updated = [...reviewQuestions];
                              updated[i] = { ...updated[i], points: Number(e.target.value) };
                              setReviewQuestions(updated);
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-label-xs text-muted-foreground">{_('Answer')}:</span>
                          <input
                            className="flex-1 bg-background text-foreground border border-border rounded px-2 py-1 text-sm"
                            value={q.correctAnswer || q.answer || ''}
                            onChange={(e) => {
                              const updated = [...reviewQuestions];
                              updated[i] = { ...updated[i], correctAnswer: e.target.value, answer: e.target.value };
                              setReviewQuestions(updated);
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}
