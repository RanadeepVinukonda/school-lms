import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/skeleton';
import { cardStackReveal } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import { useClasses } from '@/hooks/useClasses';
import { formatClassName } from '@/services/classService';
import api from '@/services/api';
import { getTextbooksBySubject, getChaptersForTextbook } from '@/services/textbookService';
import { getStudentsByClass } from '@/services/dataService';
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

const EXAM_TYPE_MAP: Record<string, string[]> = { multiple_choice: ['mcq', 'multiple_choice'] };

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
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(60);
  const [selectedModels, setSelectedModels] = useState<string[]>(['multiple_choice', 'true_false']);
  const [questionCount, setQuestionCount] = useState(10);
  const [passingScore, setPassingScore] = useState(50);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);

  const [publishScope, setPublishScope] = useState<'class' | 'students'>('class');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [distribution, setDistribution] = useState<Record<string, Record<string, number>>>({
    easy: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
    medium: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
    hard: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
    hots: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
  });

  const [reviewQuestions, setReviewQuestions] = useState<any[]>([]);

  function handleEditQuestion(index: number, field: string, value: any) {
    setReviewQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function handleEditOption(index: number, optionIndex: number, value: string) {
    setReviewQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[index] };
      const opts = [...(q.options || [])];
      opts[optionIndex] = value;
      q.options = opts;
      next[index] = q;
      return next;
    });
  }

  function handleDeleteQuestion(index: number) {
    setReviewQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleMoveQuestion(index: number, direction: 'up' | 'down') {
    setReviewQuestions((prev) => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleAddQuestion() {
    const newQ = {
      id: `manual_${Date.now()}`,
      type: 'multiple_choice',
      text: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      difficulty: 'medium',
      points: 1,
      explanation: '',
      conceptId: '',
    };
    setReviewQuestions((prev) => [...prev, newQ]);
  }

  function handleRegenerateQuestion(index: number) {
    const q = reviewQuestions[index];
    if (!q.conceptId) {
      toast.error(_('Cannot regenerate: no conceptId on question'));
      return;
    }
    api
      .post('/ai-question-generator/generate', {
        conceptId: q.conceptId,
        types: [q.type],
        count: 1,
        difficulty: q.difficulty || 'medium',
      })
      .then((res) => {
        const newQs = res.data?.data?.questions || res.data?.data || [];
        if (newQs.length > 0) {
          const newQ = newQs[0];
          handleEditQuestion(index, 'text', newQ.question || newQ.text || '');
          handleEditQuestion(index, 'options', newQ.options || []);
          handleEditQuestion(index, 'correctAnswer', newQ.answer || newQ.correctAnswer || '');
          handleEditQuestion(index, 'explanation', newQ.explanation || '');
          toast.success(_('Question regenerated'));
        } else {
          toast.error(_('AI returned no questions'));
        }
      })
      .catch(() => toast.error(_('Failed to regenerate question')));
  }

  const totalEditablePoints = useMemo(
    () => reviewQuestions.reduce((sum, q) => sum + (Number(q.points) || 1), 0),
    [reviewQuestions],
  );

  const { data: assignments, isLoading: assignmentsLoading, error: assignmentsError } = useQuery({
    queryKey: ['teacher-assignments', user?.id],
    queryFn: () => api.get('/teacher-class-subject/my').then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const { data: classes = [] } = useClasses();

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

  const { data: breakdown } = useQuery({
    queryKey: ['question-breakdown', selectedTextbookId, selectedChapterId],
    queryFn: () => api.get(`/exams-v2/breakdown/${selectedTextbookId}/${selectedChapterId}`).then((r) => r.data.data),
    enabled: !!selectedTextbookId && !!selectedChapterId,
  });

  const { data: chapterConcepts = [] } = useQuery({
    queryKey: ['chapter-concepts', selectedTextbookId, selectedChapterId],
    queryFn: () => api.get(`/textbooks/${selectedTextbookId}/chapters/${selectedChapterId}/concepts`).then((r) => r.data.data || []),
    enabled: !!selectedTextbookId && !!selectedChapterId,
  });

  const typeCountMap: Record<string, number> = {};
  const diffCountMap: Record<string, number> = {};
  if (breakdown) {
    for (const t of breakdown.types || []) typeCountMap[t.type] = t.count;
    for (const d of breakdown.difficulties || []) diffCountMap[d.difficulty] = d.count;
  }

  const { data: classStudents } = useQuery({
    queryKey: ['teacher-class-students', selectedClassId],
    queryFn: () => getStudentsByClass(selectedClassId),
    enabled: !!selectedClassId && publishScope === 'students',
  });

  useEffect(() => {
    if (selectedModels.length === 0 || questionCount === 0) {
      const empty = { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 };
      setDistribution({ easy: { ...empty }, medium: { ...empty }, hard: { ...empty }, hots: { ...empty } });
      return;
    }
    const backendTypes = selectedModels.map((m: string) => (EXAM_TYPE_MAP[m] || [m])[0]);
    const numTypes = backendTypes.length;
    const totalCells = numTypes * 4;
    const perCell = Math.floor(questionCount / totalCells);
    let remainder = questionCount - perCell * totalCells;
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

  const distTotal = useMemo(() => {
    const activeTypes = QUESTION_MODEL_OPTIONS.filter(m => selectedModels.includes(m.value));
    return ['easy', 'medium', 'hard', 'hots'].reduce((sum, diff) =>
      sum + activeTypes.reduce((s, m) => {
        const t = m.value === 'multiple_choice' ? 'mcq' : m.value;
        return s + (distribution[diff]?.[t] ?? 0);
      }, 0), 0);
  }, [distribution, selectedModels]);

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.post('/exams-v2', body);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success(_('Exam created successfully'));
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setTitle('');
      setDescription('');
      setTimeLimitMinutes(60);
      setSelectedModels(['multiple_choice', 'true_false']);
      setQuestionCount(10);
      setPassingScore(50);
      setMaxAttempts(1);
      setReviewQuestions([]);
      const empty = { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 };
      setDistribution({ easy: { ...empty }, medium: { ...empty }, hard: { ...empty }, hots: { ...empty } });
    },
    onError: (err: unknown) => {
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

  function setDist(diff: string, type: string, val: number) {
    setDistribution((prev) => {
      const next = { ...prev, [diff]: { ...prev[diff], [type]: val } };
      return next;
    });
  }

  function canCreate(): boolean {
    return (
      !!title.trim() &&
      !!selectedClassId &&
      !!selectedTextbookId &&
      !!selectedChapterId &&
      selectedModels.length > 0 &&
      timeLimitMinutes > 0 &&
      questionCount > 0 &&
      !isNaN(Number(questionCount)) &&
      chapterConcepts.length > 0 &&
      passingScore >= 0 &&
      maxAttempts > 0 &&
      !createMutation.isPending
    );
  }

  function handleCreate() {
    if (!canCreate()) return;
    const qc = Number(questionCount);
    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description || '',
      classId: selectedClassId,
      subjectId: selectedAssignment?.subjectId || '',
      textbookId: selectedTextbookId,
      chapterId: selectedChapterId,
      teacherId,
      timeLimitMinutes,
      selectedModels: [...selectedModels],
      questionCountPerConcept: isNaN(qc) ? 10 : Math.floor(qc),
      passingScore,
      maxAttempts,
      distribution,
      shuffleQuestions,
      showResults: true,
      targetStudentIds: publishScope === 'students' ? selectedStudentIds : [],
    };
    if (reviewQuestions.length > 0) {
      (body as any).questions = reviewQuestions;
    }
    createMutation.mutate(body);
  }

  function handleGeneratePreview() {
    if (!selectedClassId || !selectedTextbookId || !selectedChapterId) return;
    const qc = Number(questionCount);
    generatePreviewMutation.mutate({
      title: title.trim() || 'Preview',
      description: description || '',
      classId: selectedClassId,
      subjectId: selectedAssignment?.subjectId || '',
      textbookId: selectedTextbookId,
      chapterId: selectedChapterId,
      teacherId,
      timeLimitMinutes,
      selectedModels: [...selectedModels],
      questionCountPerConcept: isNaN(qc) ? 10 : Math.floor(qc),
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

  const uniqueClasses = classes.map((c) => ({ classId: c.id, className: formatClassName(c) }));

  return (
    <>
      <SEOHead title={_('Exams')} description={_('Create chapter-level exams')} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-6"
      >
        <motion.div variants={cardStackReveal} custom={0}>
          <h1 className="text-headline-sm">{_('Exams')}</h1>
          <p className="text-body-md text-muted-foreground">
            {_('Create chapter-level exams from all concepts in a chapter')}
          </p>
        </motion.div>

        <motion.div variants={cardStackReveal} custom={0}>
          <Card className="border-border/60">
            <CardContent className="p-5 space-y-6">
              <div className="flex items-center gap-2">
                <Icon name="school" size={16} className="text-primary" />
                <span className="text-title-sm">{_('Class & Content Selection')}</span>
              </div>

              <div>
                <Label className="mb-2 block">{_('Class')}</Label>
                <select
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setSelectedSubjectId('');
                    setSelectedTextbookId('');
                    setSelectedChapterId('');
                    setReviewQuestions([]);
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">{_('Select a class...')}</option>
                  {uniqueClasses.map((a) => (
                    <option key={a.classId} value={a.classId}>{a.className}</option>
                  ))}
                </select>
              </div>

              {classAssignments.length > 0 && (
                <div>
                  <Label className="mb-2 block">{_('Subject')}</Label>
                  {classAssignments.length === 1 ? (
                    <p className="text-sm text-muted-foreground">{classAssignments[0].subjectName}</p>
                  ) : (
                    <select
                      value={effectiveSubjectId}
                      onChange={(e) => {
                        setSelectedSubjectId(e.target.value);
                        setSelectedTextbookId('');
                        setSelectedChapterId('');
                        setReviewQuestions([]);
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {classAssignments.map((a) => (
                        <option key={a.subjectId} value={a.subjectId}>{a.subjectName}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {selectedAssignment && (
                <div>
                  <Label className="mb-2 block">{_('Textbook')}</Label>
                  <select
                    value={selectedTextbookId}
                    onChange={(e) => {
                      setSelectedTextbookId(e.target.value);
                      setSelectedChapterId('');
                      setReviewQuestions([]);
                    }}
                    disabled={!selectedAssignment || textbooksLoading}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{_('Select a textbook...')}</option>
                    {textbooks.map((tb: Textbook) => (
                      <option key={tb.id} value={tb.id}>{tb.title || tb.id}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedTextbookId && (
                <div>
                  <Label className="mb-2 block">{_('Chapter')}</Label>
                  {chaptersLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <select
                      value={selectedChapterId}
                      onChange={(e) => {
                        setSelectedChapterId(e.target.value);
                        setReviewQuestions([]);
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">{_('Select a chapter...')}</option>
                      {chapters.map((ch: Chapter) => (
                        <option key={ch.id} value={ch.id}>{_('Chapter')} {ch.order + 1}: {ch.title}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {selectedClassId && (
                <div>
                  <Label className="mb-2 block">{_('Push to')}</Label>
                  <div className="flex gap-3 mb-3">
                    <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer flex-1 ${
                      publishScope === 'class'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}>
                      <input
                        type="radio"
                        name="scope"
                        checked={publishScope === 'class'}
                        onChange={() => { setPublishScope('class'); setSelectedStudentIds([]); }}
                        className="text-primary"
                      />
                      <span className="text-sm">{_('Whole Class')}</span>
                    </label>
                    <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer flex-1 ${
                      publishScope === 'students'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}>
                      <input
                        type="radio"
                        name="scope"
                        checked={publishScope === 'students'}
                        onChange={() => setPublishScope('students')}
                        className="text-primary"
                      />
                      <span className="text-sm">{_('Selected Students')}</span>
                    </label>
                  </div>
                  {publishScope === 'students' && (
                    <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                      {classStudents?.length ? (
                        classStudents.map((s: any) => (
                          <label key={s.id || s.uid} className="flex items-center gap-2 cursor-pointer text-sm">
                            <Checkbox
                              checked={selectedStudentIds.includes(s.id || s.uid)}
                              onCheckedChange={(checked) => {
                                const sid = s.id || s.uid;
                                setSelectedStudentIds((prev) =>
                                  checked ? [...prev, sid] : prev.filter((id) => id !== sid),
                                );
                              }}
                            />
                            <span>{s.displayName || s.email}</span>
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">{_('No students found in this class')}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardStackReveal} custom={0}>
          <Card className="border-border/60">
            <CardContent className="p-5 space-y-6">
              <div className="flex items-center gap-2">
                <Icon name="quiz" size={16} className="text-primary" />
                <span className="text-title-sm">{_('Exam Details')}</span>
              </div>

              <div>
                <Label htmlFor="exam-title" className="mb-2 block">{_('Title')}</Label>
                <Input
                  id="exam-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={_('e.g. Mid-term Science Exam')}
                />
              </div>

              <div>
                <Label htmlFor="exam-desc" className="mb-2 block">{_('Description')}</Label>
                <Textarea
                  id="exam-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={_('Provide instructions or context for this exam')}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="exam-time-limit" className="mb-2 block">{_('Time Limit (minutes)')}</Label>
                  <Input
                    id="exam-time-limit"
                    type="number"
                    min={1}
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="exam-question-count" className="mb-2 block">{_('Question Count')}</Label>
                  <Input
                    id="exam-question-count"
                    type="number"
                    min={1}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="exam-passing-score" className="mb-2 block">{_('Passing Score (%)')}</Label>
                  <Input
                    id="exam-passing-score"
                    type="number"
                    min={0}
                    max={100}
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="exam-max-attempts" className="mb-2 block">{_('Max Attempts')}</Label>
                  <Input
                    id="exam-max-attempts"
                    type="number"
                    min={1}
                    value={maxAttempts}
                    onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-end pb-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <Switch checked={shuffleQuestions} onCheckedChange={setShuffleQuestions} />
                  <div>
                    <span className="text-sm font-medium">{_('Shuffle Questions')}</span>
                    <p className="text-label-xs text-muted-foreground">{_('Randomize question order for each student')}</p>
                  </div>
                </label>
              </div>

              <div>
                <Label className="mb-2 block">{_('Available Question Types')}</Label>
                {selectedChapterId && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Object.entries(diffCountMap).map(([d, c]) => (
                      <span key={d} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {d.charAt(0).toUpperCase() + d.slice(1)}: {c}
                      </span>
                    ))}
                    {breakdown?.hotsCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        HOTS: {breakdown.hotsCount}
                      </span>
                    )}
                    {breakdown?.total > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        Total: {breakdown.total}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-label-xs text-muted-foreground mb-3">
                  {_('Select which question types to pull from the question bank')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {QUESTION_MODEL_OPTIONS.map((model) => {
                    const mappedType = model.value === 'multiple_choice' ? 'mcq' : model.value;
                    const available = typeCountMap[mappedType] || 0;
                    return (
                      <label
                        key={model.value}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedModels.includes(model.value)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        <Checkbox
                          checked={selectedModels.includes(model.value)}
                          onCheckedChange={() => handleToggleModel(model.value)}
                        />
                        <span className="text-sm">{model.label}</span>
                        {selectedChapterId && (
                          <span className="ml-auto text-xs text-muted-foreground">{available > 0 ? `(${available})` : ''}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {selectedChapterId && (
                <div className="border-t border-border/60 pt-4">
                  <div className="space-y-3 p-4 rounded-lg border border-border/60 bg-muted/20 mb-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {_('Auto-distributed equally across difficulties. Adjust cells manually as needed.')}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-semibold ${distTotal !== questionCount ? 'text-destructive' : ''}`}>
                          Total: {distTotal} / {questionCount} {_('questions')}
                        </p>
                        {distTotal !== questionCount && selectedModels.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (selectedModels.length === 0 || questionCount === 0) return;
                              const backendTypes = selectedModels.map((m: string) => (EXAM_TYPE_MAP[m] || [m])[0]);
                              const numTypes = backendTypes.length;
                              const totalCells = numTypes * 4;
                              const perCell = Math.floor(questionCount / totalCells);
                              let rem = questionCount - perCell * totalCells;
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
                      {(() => {
                        const activeTypes = QUESTION_MODEL_OPTIONS.filter(m => selectedModels.includes(m.value));
                        return (
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
                                    const avail = typeCountMap[mappedType] || 0;
                                    return (
                                      <td key={m.value} className="text-center px-1 py-1">
                                        <input
                                          type="number"
                                          min={0}
                                          max={avail}
                                          value={distribution[diff]?.[mappedType] ?? 0}
                                          onChange={(e) => setDist(diff, mappedType, parseInt(e.target.value) || 0)}
                                          className="w-14 text-center rounded border border-border bg-background px-1 py-1 text-xs"
                                        />
                                        <div className="text-[10px] text-muted-foreground">/ {avail}</div>
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
                        );
                      })()}
                    </div>

                    {distTotal > questionCount && (
                      <p className="text-xs text-red-500">{_('Total exceeds question count by')} {distTotal - questionCount}</p>
                    )}
                  </div>
                </div>
              )}

              {isNaN(Number(questionCount)) && (
                <p className="text-xs text-destructive text-center">Please enter a valid question count.</p>
              )}
              {!!selectedChapterId && chapterConcepts.length === 0 && (
                <p className="text-xs text-destructive text-center">This chapter has no concepts assigned.</p>
              )}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                {selectedChapterId && (
                  <Button
                    onClick={handleGeneratePreview}
                    disabled={generatePreviewMutation.isPending || !selectedChapterId}
                    variant="outline"
                    className="gap-2"
                  >
                    {generatePreviewMutation.isPending ? (
                      <><Icon name="hourglass_top" size={16} className="animate-spin" /> {_('Generating...')}</>
                    ) : (
                      <><Icon name="visibility" size={16} /> {_('Preview')} ({questionCount} {_('questions')})</>
                    )}
                  </Button>
                )}

                <Button
                  onClick={handleCreate}
                  disabled={!canCreate()}
                  className="gap-2"
                  size="lg"
                >
                  {createMutation.isPending ? (
                    <><Icon name="hourglass_top" size={18} className="animate-spin" /> {_('Creating Exam...')}</>
                  ) : (
                    <><Icon name="fact_check" size={18} /> {_('Create Exam')}</>
                  )}
                </Button>
              </div>

              {reviewQuestions.length > 0 && (
                <div className="border rounded-lg p-3 bg-background space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-primary">
                      {_('Preview')} ({reviewQuestions.length} {_('questions')}, {totalEditablePoints} {_('points')})
                    </p>
                    {reviewQuestions.length < questionCount && (
                      <p className="text-[10px] text-amber-600">{_('Warning: fewer questions than requested')}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleAddQuestion} className="gap-1 h-7 text-[10px]">
                        <Icon name="add" size={12} />
                        {_('Add')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setReviewQuestions([])} className="h-7">
                        <Icon name="close" size={14} />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {reviewQuestions.map((q: any, i: number) => (
                      <div key={q.id || i} className="rounded-lg border border-border/60 p-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs mb-1">
                          <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleMoveQuestion(i, 'up')} disabled={i === 0} className="h-5 w-5 p-0">
                              <Icon name="arrow_upward" size={12} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleMoveQuestion(i, 'down')} disabled={i === reviewQuestions.length - 1} className="h-5 w-5 p-0">
                              <Icon name="arrow_downward" size={12} />
                            </Button>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteQuestion(i)} className="h-5 w-5 p-0 text-destructive">
                            <Icon name="delete" size={12} />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <select
                            value={q.type || 'multiple_choice'}
                            onChange={(e) => handleEditQuestion(i, 'type', e.target.value)}
                            className="rounded border border-border bg-background px-2 py-1 text-[10px]"
                          >
                            {QUESTION_MODEL_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{_('MCQ')}</option>
                            ))}
                            <option value="multiple_choice">Multiple Choice</option>
                            <option value="true_false">True / False</option>
                            <option value="short_answer">Short Answer</option>
                            <option value="fill_blank">Fill Blank</option>
                          </select>

                          <select
                            value={q.difficulty || 'medium'}
                            onChange={(e) => handleEditQuestion(i, 'difficulty', e.target.value)}
                            className="rounded border border-border bg-background px-2 py-1 text-[10px]"
                          >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                          </select>

                          <Input
                            type="number"
                            min={1}
                            value={q.points ?? 1}
                            onChange={(e) => handleEditQuestion(i, 'points', parseInt(e.target.value) || 1)}
                            className="h-7 text-[10px]"
                            placeholder={_('Points')}
                          />
                        </div>

                        <Input
                          value={q.text || ''}
                          onChange={(e) => handleEditQuestion(i, 'text', e.target.value)}
                          className="text-xs"
                          placeholder={_('Question text...')}
                        />

                        {(q.type === 'multiple_choice' || q.type === 'mcq') && q.options && Array.isArray(q.options) && (
                          <div className="space-y-1">
                            {q.options.map((opt: string, oi: number) => (
                              <div key={oi} className="flex items-center gap-1">
                                <span className="text-[10px] font-mono text-muted-foreground w-4">{String.fromCharCode(65 + oi)}.</span>
                                <Input
                                  value={opt || ''}
                                  onChange={(e) => handleEditOption(i, oi, e.target.value)}
                                  className="h-7 text-[10px] flex-1"
                                  placeholder={`${_('Option')} ${String.fromCharCode(65 + oi)}`}
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === 'true_false' && (
                          <select
                            value={q.correctAnswer || ''}
                            onChange={(e) => handleEditQuestion(i, 'correctAnswer', e.target.value)}
                            className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                          >
                            <option value="">{_('Select correct answer...')}</option>
                            <option value="true">True</option>
                            <option value="false">False</option>
                          </select>
                        )}

                        {(q.type === 'short_answer' || q.type === 'fill_blank') && (
                          <Input
                            value={q.correctAnswer || ''}
                            onChange={(e) => handleEditQuestion(i, 'correctAnswer', e.target.value)}
                            className="h-7 text-xs"
                            placeholder={_('Correct answer...')}
                          />
                        )}

                        {(q.type === 'multiple_choice' || q.type === 'mcq') && (
                          <Input
                            value={q.correctAnswer || ''}
                            onChange={(e) => handleEditQuestion(i, 'correctAnswer', e.target.value)}
                            className="h-7 text-xs"
                            placeholder={_('Correct answer (A, B, C, or D)...')}
                          />
                        )}

                        {q.explanation !== undefined && (
                          <Input
                            value={q.explanation || ''}
                            onChange={(e) => handleEditQuestion(i, 'explanation', e.target.value)}
                            className="h-7 text-[10px] text-muted-foreground"
                            placeholder={_('Explanation (optional)...')}
                          />
                        )}

                        <Button variant="outline" size="sm" onClick={() => handleRegenerateQuestion(i)} className="gap-1 h-6 text-[10px]">
                          <Icon name="refresh" size={10} />
                          {_('Regenerate')}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
}
