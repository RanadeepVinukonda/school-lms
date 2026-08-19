import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';
import { useClasses } from '@/hooks/useClasses';
import { formatClassName } from '@/services/classService';
import api from '@/services/api';
import { getTextbooksBySubject, getChaptersForTextbook, getConceptsForChapter } from '@/services/textbookService';
import { unifiedTestEngineService } from '@/services/unifiedTestEngineService';
import { getStudentsByClass } from '@/services/dataService';

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'matching', label: 'Matching' },
  { value: 'descriptive', label: 'Descriptive' },
  { value: 'numerical', label: 'Numerical' },
  { value: 'passage', label: 'Passage' },
  { value: 'assertion_reason', label: 'Assertion Reason' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'application_based', label: 'Application Based' },
  { value: 'hots', label: 'HOTS' },
];

const TEST_TYPES = [
  { value: 'quiz', label: 'Quiz', icon: 'quiz' },
  { value: 'assignment', label: 'Assignment', icon: 'assignment' },
  { value: 'exam', label: 'Exam', icon: 'fact_check' },
];

export default function TeacherUnifiedTestPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('create');
  const [testType, setTestType] = useState<'quiz' | 'assignment' | 'exam'>('quiz');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTextbookId, setSelectedTextbookId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [selectedConceptId, setSelectedConceptId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>(['multiple_choice', 'true_false']);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [questionCount, setQuestionCount] = useState(10);
  const [passingScore, setPassingScore] = useState(50);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [publishScope, setPublishScope] = useState<'class' | 'students'>('class');
  const [publishToAll, setPublishToAll] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [reviewQuestions, setReviewQuestions] = useState<any[]>([]);
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['teacher-assignments', user?.id],
    queryFn: () => api.get('/teacher-class-subject/my').then((r) => r.data.data ?? []),
    enabled: !!user?.id,
  });

  const { data: classes = [] } = useClasses();
  const assignmentList = Array.isArray(assignments) ? assignments : [];
  const effectiveSubjectId = selectedSubjectId || '';
  const { data: textbooks } = useQuery({
    queryKey: ['teacher-textbooks', effectiveSubjectId],
    queryFn: () => getTextbooksBySubject(effectiveSubjectId),
    enabled: !!effectiveSubjectId,
  });

  const { data: chapters } = useQuery({
    queryKey: ['teacher-chapters', selectedTextbookId],
    queryFn: () => getChaptersForTextbook(selectedTextbookId),
    enabled: !!selectedTextbookId,
  });

  const { data: concepts } = useQuery({
    queryKey: ['teacher-concepts', selectedTextbookId, selectedChapterId],
    queryFn: () => getConceptsForChapter(selectedTextbookId, selectedChapterId),
    enabled: !!selectedTextbookId && !!selectedChapterId,
  });

  const { data: classStudents } = useQuery({
    queryKey: ['class-students', selectedClassId],
    queryFn: () => getStudentsByClass(selectedClassId),
    enabled: !!selectedClassId && publishScope === 'students',
  });

  const { data: templates } = useQuery({
    queryKey: ['test-templates', user?.id],
    queryFn: () => unifiedTestEngineService.getTemplates(),
    enabled: !!user?.id,
  });

  const textbookList = textbooks ?? [];
  const chapterList = chapters ?? [];
  const conceptList = concepts ?? [];
  const templateList = Array.isArray(templates) ? templates : [];
  const effectiveMaxAttempts = testType === 'exam' ? 1 : maxAttempts;
  const handleModelToggle = useCallback((model: string) => {
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model],
    );
  }, []);

  const createTestMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => unifiedTestEngineService.createTest(body),
    onSuccess: () => {
      toast.success(`${testType.charAt(0).toUpperCase() + testType.slice(1)} created and published successfully`);
      queryClient.invalidateQueries({ queryKey: ['unified-tests', selectedClassId] });
      setReviewQuestions([]);
      setTitle('');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to create test');
    },
  });

  const previewMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => unifiedTestEngineService.previewTest(body),
    onSuccess: (data) => {
      if (data.questions?.length) {
        setReviewQuestions(data.questions);
        toast.success(`Preview: ${data.questions.length} questions (${data.aiGeneratedCount ?? 0} AI)`);
      } else {
        toast.error('No questions generated. Check concept has question bank.');
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to generate preview');
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => unifiedTestEngineService.createTemplate(body),
    onSuccess: () => {
      toast.success('Template saved');
      queryClient.invalidateQueries({ queryKey: ['test-templates', user?.id] });
      setTemplateName('');
      setTemplateDescription('');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to save template'),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => unifiedTestEngineService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-templates', user?.id] });
      toast.success('Template deleted');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete template'),
  });

  const applyTemplate = useCallback((template: any) => {
    setTitle('');
    setDescription(template.description || '');
    setSelectedModels(template.selectedModels || []);
    setTimeLimitMinutes(template.timeLimitMinutes || 30);
    setQuestionCount(template.questionCount || 10);
    setPassingScore(template.passingScore || 50);
    setMaxAttempts(template.maxAttempts || 3);
    setShuffleQuestions(template.shuffleQuestions ?? true);
    setShowResults(template.showResults ?? false);
    setSelectedTemplateId(template.id);
    toast.info(`Template "${template.name}" applied`);
  }, []);

  const handleCreate = useCallback(() => {
    if (!selectedClassId || !selectedTextbookId || !selectedChapterId || !selectedConceptId) {
      toast.error('Please select class, textbook, chapter, and concept');
      return;
    }
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (selectedModels.length === 0) {
      toast.error('Please select at least one question type');
      return;
    }

    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      testType,
      classId: selectedClassId,
      subjectId: selectedSubjectId || undefined,
      textbookId: selectedTextbookId,
      chapterId: selectedChapterId,
      conceptId: selectedConceptId,
      templateId: selectedTemplateId || undefined,
      teacherId: user?.id ?? '',
      timeLimitMinutes,
      selectedModels,
      questionCount,
      passingScore,
      maxAttempts: effectiveMaxAttempts,
      shuffleQuestions,
      showResults,
      publishedTo: publishScope,
      targetStudentIds: publishScope === 'students' ? selectedStudentIds : [],
    };

    if (reviewQuestions.length > 0) {
      body.questions = reviewQuestions;
    }

    createTestMutation.mutate(body);
  }, [
    selectedClassId, selectedTextbookId, selectedChapterId, selectedConceptId,
    title, description, testType, selectedSubjectId, user?.id,
    timeLimitMinutes, selectedModels, questionCount, passingScore,
    effectiveMaxAttempts, shuffleQuestions, showResults,
    publishScope, publishToAll, selectedStudentIds, selectedTemplateId,
    reviewQuestions, createTestMutation,
  ]);

  const handleSaveTemplate = useCallback(() => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    createTemplateMutation.mutate({
      name: templateName.trim(),
      description: templateDescription.trim(),
      testType,
      selectedModels,
      timeLimitMinutes,
      questionCount,
      passingScore,
      maxAttempts: effectiveMaxAttempts,
      shuffleQuestions,
      showResults,
    });
  }, [templateName, templateDescription, testType, selectedModels, timeLimitMinutes, questionCount, passingScore, effectiveMaxAttempts, shuffleQuestions, showResults, createTemplateMutation]);

  const handlePreview = useCallback(() => {
    if (!selectedClassId || !selectedTextbookId || !selectedChapterId || !selectedConceptId) {
      toast.error('Please select class, textbook, chapter, and concept');
      return;
    }
    previewMutation.mutate({
      title: title.trim() || 'Preview',
      testType,
      classId: selectedClassId,
      subjectId: selectedSubjectId || undefined,
      textbookId: selectedTextbookId,
      chapterId: selectedChapterId,
      conceptId: selectedConceptId,
      teacherId: user?.id ?? '',
      timeLimitMinutes,
      selectedModels,
      questionCount,
      preview: true,
    });
  }, [selectedClassId, selectedTextbookId, selectedChapterId, selectedConceptId, title, testType, selectedSubjectId, user?.id, timeLimitMinutes, selectedModels, questionCount, previewMutation]);

  const classAssignments = assignmentList.filter((a: any) => a.classId === selectedClassId);
  const selectedAssignment = classAssignments[0];
  useEffect(() => {
    if (classAssignments.length === 1 && !selectedSubjectId) {
      setSelectedSubjectId(classAssignments[0].subjectId);
    }
  }, [classAssignments, selectedSubjectId]);

  return (
    <>
      <SEOHead title="Push Test" description="Create and publish unified tests" />
      <div className="sm:p-6 p-4 max-w-5xl mx-auto pb-32 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-headline-sm">Push Test</h1>
            <p className="text-body-md text-muted-foreground">Create unified quizzes, assignments, and exams</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="create">Create Test</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardContent className="p-5 space-y-6">
                <div className="flex items-center gap-2">
                  <Icon name="category" size={16} className="text-primary" />
                  <span className="text-title-sm">Test Type</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TEST_TYPES.map((tt) => (
                    <button
                      key={tt.value}
                      onClick={() => setTestType(tt.value as any)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        testType === tt.value
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <Icon name={tt.icon} size={24} className={testType === tt.value ? 'text-primary' : 'text-muted-foreground'} />
                      <span className={`text-sm font-medium ${testType === tt.value ? 'text-primary' : ''}`}>{tt.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 space-y-6">
                <div className="flex items-center gap-2">
                  <Icon name="school" size={16} className="text-primary" />
                  <span className="text-title-sm">Class & Content Selection</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">Class</Label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => {
                        setSelectedClassId(e.target.value);
                        setSelectedSubjectId('');
                        setSelectedTextbookId('');
                        setSelectedChapterId('');
                        setSelectedConceptId('');
                        setReviewQuestions([]);
                        setSelectedStudentIds([]);
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select a class...</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{formatClassName(c)}</option>
                      ))}
                    </select>
                  </div>

                  {classAssignments.length > 0 && (
                    <div>
                      <Label className="mb-2 block">Subject</Label>
                      {classAssignments.length === 1 ? (
                        <div className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                          {classAssignments[0].subjectName} ({classAssignments[0].className})
                        </div>
                      ) : (
                        <select
                          value={selectedSubjectId || ''}
                          onChange={(e) => {
                            setSelectedSubjectId(e.target.value);
                            setSelectedTextbookId('');
                            setSelectedChapterId('');
                            setSelectedConceptId('');
                            setReviewQuestions([]);
                          }}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Select a subject...</option>
                          {[...new Map(classAssignments.map((a: any) => [a.subjectId, a]))].map(([_, a]: any) => (
                            <option key={a.subjectId} value={a.subjectId}>{a.subjectName} ({a.className})</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="mb-2 block">Textbook</Label>
                    <select
                      value={selectedTextbookId}
                      onChange={(e) => {
                        setSelectedTextbookId(e.target.value);
                        setSelectedChapterId('');
                        setSelectedConceptId('');
                        setReviewQuestions([]);
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select...</option>
                      {textbookList.map((tb: any) => (
                        <option key={tb.id} value={tb.id}>{tb.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="mb-2 block">Chapter</Label>
                    <select
                      value={selectedChapterId}
                      onChange={(e) => {
                        setSelectedChapterId(e.target.value);
                        setSelectedConceptId('');
                        setReviewQuestions([]);
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select...</option>
                      {chapterList.map((ch: any) => (
                        <option key={ch.id} value={ch.id}>Ch {ch.order}: {ch.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="mb-2 block">Concept</Label>
                    <select
                      value={selectedConceptId}
                      onChange={(e) => {
                        setSelectedConceptId(e.target.value);
                        setReviewQuestions([]);
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select...</option>
                      {conceptList.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {templateList.length > 0 && (
                  <div>
                    <Label className="mb-2 block">Apply Template (optional)</Label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => {
                        const t = templateList.find((tm: any) => tm.id === e.target.value);
                        if (t) applyTemplate(t);
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">No template</option>
                      {templateList.map((tm: any) => (
                        <option key={tm.id} value={tm.id}>{tm.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Icon name="tune" size={18} className="text-primary" />
                  Test Settings
                </CardTitle>
                <CardDescription>Configure your {testType}</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`e.g. ${testType === 'quiz' ? 'Chapter Quiz' : testType === 'exam' ? 'Midterm Exam' : 'Homework Assignment'}`} />
                  </div>
                  <div>
                    <Label className="mb-2 block">Description</Label>
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Question Types</Label>
                  <p className="text-label-xs text-muted-foreground mb-3">
                    Select which question types to include from the concept&apos;s question bank
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {QUESTION_TYPES.map((qt) => (
                      <label
                        key={qt.value}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          selectedModels.includes(qt.value)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        <Checkbox
                          checked={selectedModels.includes(qt.value)}
                          onCheckedChange={() => handleModelToggle(qt.value)}
                        />
                        <span className="text-xs">{qt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <Label className="mb-2 block">Time Limit (min)</Label>
                    <Input type="number" min={1} value={timeLimitMinutes} onChange={(e) => setTimeLimitMinutes(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label className="mb-2 block">Question Count</Label>
                    <Input type="number" min={1} value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label className="mb-2 block">Passing Score (%)</Label>
                    <Input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label className="mb-2 block">Max Attempts</Label>
                    <Input type="number" min={1} value={effectiveMaxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} disabled={testType === 'exam'} />
                    {testType === 'exam' && <p className="text-[10px] text-muted-foreground mt-1">Exams: 1 attempt only</p>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Switch checked={shuffleQuestions} onCheckedChange={setShuffleQuestions} />
                    <div>
                      <span className="text-sm font-medium">Shuffle Questions</span>
                      <p className="text-label-xs text-muted-foreground">Randomize order for each student</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Switch checked={showResults} onCheckedChange={setShowResults} />
                    <div>
                      <span className="text-sm font-medium">Show Results</span>
                      <p className="text-label-xs text-muted-foreground">Students see answers after submission</p>
                    </div>
                  </label>
                </div>

                <div>
                  <Label className="mb-2 block">Publish To</Label>
                  <div className="flex flex-wrap gap-4">
                    <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer flex-1 min-w-[150px] ${
                      publishScope === 'class' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}>
                      <input type="radio" name="scope" checked={publishScope === 'class'} onChange={() => { setPublishScope('class'); setSelectedStudentIds([]); }} className="text-primary" />
                      <div>
                        <span className="text-sm font-medium">Entire Class</span>
                        <p className="text-label-xs text-muted-foreground">All students in this class</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer flex-1 min-w-[150px] ${
                      publishScope === 'students' ? 'border-primary bg-primary/5' : 'border-border'
                    }`}>
                      <input type="radio" name="scope" checked={publishScope === 'students'} onChange={() => setPublishScope('students')} className="text-primary" />
                      <div>
                        <span className="text-sm font-medium">Selected Students</span>
                        <p className="text-label-xs text-muted-foreground">Choose specific students</p>
                      </div>
                    </label>
                  </div>
                  {publishScope === 'students' && (
                    <div className="mt-3">
                      <Label className="mb-2 block">Select Students</Label>
                      {classStudents?.length ? (
                        <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                          {classStudents.map((s) => {
                            const checked = selectedStudentIds.includes(s.id);
                            return (
                              <label key={s.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-muted ${checked ? 'bg-primary/5' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    setSelectedStudentIds((prev) =>
                                      checked ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                                    );
                                  }}
                                  className="text-primary"
                                />
                                <span className="text-sm">{s.displayName || s.email || 'Student'}</span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No students found for this class</p>
                      )}
                      {selectedStudentIds.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">{selectedStudentIds.length} student{selectedStudentIds.length !== 1 ? 's' : ''} selected</p>
                      )}
                    </div>
                  )}
                </div>

                {reviewQuestions.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-primary flex items-center gap-1">
                        <Icon name="visibility" size={14} />
                        Preview — {reviewQuestions.length} questions
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setReviewQuestions([...reviewQuestions, { id: crypto.randomUUID?.() || Date.now().toString(), type: 'multiple_choice', difficulty: 'medium', points: 2, text: '', options: ['', '', '', ''], correctAnswer: '' }])}>
                          <Icon name="add" size={14} className="mr-1" />Add Question
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-3 bg-muted/10">
                      {reviewQuestions.map((q: any, i: number) => (
                        <div key={q.id || i} className="border rounded-lg p-3 space-y-2 bg-background">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">#{i + 1}</span>
                            <select
                              value={q.type}
                              onChange={(e) => {
                                const updated = [...reviewQuestions];
                                updated[i] = { ...updated[i], type: e.target.value };
                                setReviewQuestions(updated);
                              }}
                              className="text-[10px] border rounded px-1 py-0.5 bg-background"
                            >
                              {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <select
                              value={q.difficulty || 'medium'}
                              onChange={(e) => {
                                const updated = [...reviewQuestions];
                                updated[i] = { ...updated[i], difficulty: e.target.value };
                                setReviewQuestions(updated);
                              }}
                              className="text-[10px] border rounded px-1 py-0.5 bg-background text-foreground"
                            >
                              <option value="easy">Easy</option>
                              <option value="medium">Medium</option>
                              <option value="hard">Hard</option>
                            </select>
                            <input
                              type="number"
                              value={q.points ?? 2}
                              onChange={(e) => {
                                const updated = [...reviewQuestions];
                                updated[i] = { ...updated[i], points: Number(e.target.value) };
                                setReviewQuestions(updated);
                              }}
                              className="text-[10px] border rounded px-1 py-0.5 w-12 bg-background text-foreground"
                              min={1}
                            />
                            <span className="text-[10px] text-muted-foreground">pts</span>
                            <button
                              onClick={() => {
                                const updated = reviewQuestions.filter((_, idx) => idx !== i);
                                setReviewQuestions(updated);
                              }}
                              className="ml-auto text-destructive hover:text-destructive/80"
                            >
                              <Icon name="delete" size={14} />
                            </button>
                          </div>
                          <Textarea
                            value={q.text}
                            onChange={(e) => {
                              const updated = [...reviewQuestions];
                              updated[i] = { ...updated[i], text: e.target.value };
                              setReviewQuestions(updated);
                            }}
                            placeholder="Question text"
                            className="text-sm min-h-[60px]"
                          />
                          {q.options && (
                            <div className="space-y-1 pl-2 border-l-2 border-border">
                              {q.options.map((opt: string, oi: number) => (
                                <div key={oi} className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground w-4">{String.fromCharCode(65 + oi)}.</span>
                                  <input
                                    value={opt}
                                    onChange={(e) => {
                                      const updated = [...reviewQuestions];
                                      const newOpts = [...(updated[i].options || [])];
                                      newOpts[oi] = e.target.value;
                                      updated[i] = { ...updated[i], options: newOpts };
                                      setReviewQuestions(updated);
                                    }}
                                    className="text-xs border rounded px-1 py-0.5 flex-1 bg-background text-foreground"
                                  />
                                  <button
                                    onClick={() => {
                                      const updated = [...reviewQuestions];
                                      const newOpts = (updated[i].options || []).filter((_: string, idx: number) => idx !== oi);
                                      updated[i] = { ...updated[i], options: newOpts.length ? newOpts : [''] };
                                      setReviewQuestions(updated);
                                    }}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <Icon name="remove_circle" size={12} />
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => {
                                  const updated = [...reviewQuestions];
                                  updated[i] = { ...updated[i], options: [...(updated[i].options || []), ''] };
                                  setReviewQuestions(updated);
                                }}
                                className="text-xs text-primary hover:underline mt-1"
                              >
                                + Add option
                              </button>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-green-600 font-medium">Answer:</span>
                            <input
                              value={q.correctAnswer}
                              onChange={(e) => {
                                const updated = [...reviewQuestions];
                                updated[i] = { ...updated[i], correctAnswer: e.target.value };
                                setReviewQuestions(updated);
                              }}
                              className="text-xs border rounded px-1 py-0.5 flex-1 bg-background text-foreground"
                              placeholder="Correct answer"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handlePreview}
                    disabled={previewMutation.isPending || !selectedConceptId}
                    className="flex-1"
                  >
                    {previewMutation.isPending ? 'Generating...' : `Generate Preview (${questionCount} questions)`}
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createTestMutation.isPending || !selectedConceptId || !title.trim()}
                    className="flex-1"
                  >
                    {createTestMutation.isPending ? 'Creating...' : `Push ${testType.charAt(0).toUpperCase() + testType.slice(1)}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Save Current Settings as Template</CardTitle>
                <CardDescription>Save your test configuration for reuse</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block">Template Name</Label>
                    <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Standard Quiz Template" />
                  </div>
                  <div>
                    <Label className="mb-2 block">Description</Label>
                    <Input value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} placeholder="Optional" />
                  </div>
                </div>
                <Button onClick={handleSaveTemplate} disabled={createTemplateMutation.isPending || !templateName.trim()}>
                  {createTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Templates</CardTitle>
                <CardDescription>Saved test configurations</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                {templateList.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No templates saved yet</p>
                ) : (
                  <div className="space-y-3">
                    {templateList.map((tm: any) => (
                      <div key={tm.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">{tm.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {tm.testType} | {tm.selectedModels?.length || 0} question types | {tm.questionCount} questions | {tm.timeLimitMinutes} min
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setActiveTab('create'); applyTemplate(tm); }}>
                            Apply
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteTemplateMutation.mutate(tm.id)}>
                            <Icon name="delete" size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
