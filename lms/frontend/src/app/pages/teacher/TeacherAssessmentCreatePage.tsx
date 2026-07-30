import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/skeleton';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { getTextbooksBySubject, getChaptersForTextbook, getConceptsForChapter } from '@/services/textbookService';
import { getStudentsByClass } from '@/services/dataService';
import { useSearchParams, useNavigate } from 'react-router-dom';

interface TeacherAssignment {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
}

interface AssignmentQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank' | 'matching';
  points: number;
  options: string[];
  correctAnswer: string;
}

let questionIdCounter = 0;
function freshQuestionId(): string {
  questionIdCounter += 1;
  return `q_${questionIdCounter}_${Date.now()}`;
}

function createEmptyQuestion(): AssignmentQuestion {
  return {
    id: freshQuestionId(),
    text: '',
    type: 'multiple_choice',
    points: 1,
    options: [''],
    correctAnswer: '',
  };
}

export default function TeacherAssessmentCreatePage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const QUESTION_MODELS = [
    { value: 'multiple_choice', label: _('Multiple Choice') },
    { value: 'true_false', label: _('True/False') },
    { value: 'short_answer', label: _('Short Answer') },
    { value: 'fill_blank', label: _('Fill in the Blank') },
    { value: 'matching', label: _('Matching') },
  ];
  const ASSIGNMENT_QUESTION_TYPES = [
    { value: 'multiple_choice', label: _('Multiple Choice') },
    { value: 'true_false', label: _('True/False') },
    { value: 'short_answer', label: _('Short Answer') },
    { value: 'fill_blank', label: _('Fill in the Blank') },
    { value: 'matching', label: _('Matching') },
  ];
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [assessmentType, setAssessmentType] = useState<'quiz' | 'assignment'>('quiz');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTextbookId, setSelectedTextbookId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [selectedConceptId, setSelectedConceptId] = useState('');

  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>(['multiple_choice', 'true_false']);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [questionCount, setQuestionCount] = useState(10);
  const [quizPassingScore, setQuizPassingScore] = useState(50);
  const [quizMaxAttempts, setQuizMaxAttempts] = useState(3);
  const [quizShuffle, setQuizShuffle] = useState(true);
  const [quizDistribution, setQuizDistribution] = useState<Record<string, Record<string, number>>>({
    easy: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
    medium: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
    hard: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
    hots: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
  });
  const [quizGeneratedPaper, setQuizGeneratedPaper] = useState<any[] | null>(null);

  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [assignmentTimeLimit, setAssignmentTimeLimit] = useState(60);
  const [assignmentQuestions, setAssignmentQuestions] = useState<AssignmentQuestion[]>([createEmptyQuestion()]);
  const [assignmentPassingScore, setAssignmentPassingScore] = useState(50);
  const [assignmentMaxAttempts, setAssignmentMaxAttempts] = useState(3);
  const [assignmentShuffle, setAssignmentShuffle] = useState(true);
  const [assignmentDistribution, setAssignmentDistribution] = useState<Record<string, Record<string, number>>>({
    easy: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
    medium: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
    hard: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
    hots: { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 },
  });
  const [assignmentGeneratedPaper, setAssignmentGeneratedPaper] = useState<any[] | null>(null);

  const [publishScope, setPublishScope] = useState<'class' | 'students'>('class');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [searchParams] = useSearchParams();
  const urlClassId = searchParams.get('classId');
  const urlSubjectId = searchParams.get('subjectId');
  const urlTextbookId = searchParams.get('textbookId');
  const urlChapterId = searchParams.get('chapterId');
  const urlConceptId = searchParams.get('conceptId');

  const { data: classStudents } = useQuery({
    queryKey: ['teacher-class-students', selectedClassId],
    queryFn: () => getStudentsByClass(selectedClassId),
    enabled: !!selectedClassId && publishScope === 'students',
  });

  const { data: assignments, isLoading: assignmentsLoading, error: assignmentsError } = useQuery({
    queryKey: ['teacher-assignments', user?.id],
    queryFn: () => api.get('/teacher-class-subject/my').then((r) => r.data.data),
    enabled: !!user?.id,
  });

  const assignmentList: TeacherAssignment[] = assignments ?? [];
  const classAssignments = assignmentList.filter((a) => a.classId === selectedClassId);
  const effectiveSubjectId = selectedSubjectId || classAssignments[0]?.subjectId || '';
  const selectedAssignment = classAssignments.find((a) => a.subjectId === effectiveSubjectId);

  const { data: textbooks, isLoading: textbooksLoading } = useQuery({
    queryKey: ['teacher-textbooks', selectedAssignment?.subjectId],
    queryFn: () => getTextbooksBySubject(selectedAssignment!.subjectId),
    enabled: !!selectedAssignment?.subjectId,
  });

  const textbookList = textbooks ?? [];

  const { data: chapters, isLoading: chaptersLoading } = useQuery({
    queryKey: ['teacher-chapters', selectedTextbookId],
    queryFn: () => getChaptersForTextbook(selectedTextbookId),
    enabled: !!selectedTextbookId,
  });

  const chapterList = chapters ?? [];

  const { data: concepts, isLoading: conceptsLoading } = useQuery({
    queryKey: ['teacher-concepts', selectedTextbookId, selectedChapterId],
    queryFn: () => getConceptsForChapter(selectedTextbookId, selectedChapterId),
    enabled: !!selectedTextbookId && !!selectedChapterId,
  });

  const conceptList = concepts ?? [];

  const { data: availableTypes = [] } = useQuery({
    queryKey: ['available-question-types', selectedConceptId],
    queryFn: () => api.get(`/exams-v2/concept/${selectedConceptId}/types`).then((r) => r.data.data),
    enabled: !!selectedConceptId,
  });

  const { data: breakdown } = useQuery({
    queryKey: ['question-breakdown', selectedTextbookId, selectedChapterId],
    queryFn: () => api.get(`/exams-v2/breakdown/${selectedTextbookId}/${selectedChapterId}`).then((r) => r.data.data),
    enabled: !!selectedTextbookId && !!selectedChapterId,
  });

  const typeCountMap: Record<string, number> = {};
  const diffCountMap: Record<string, number> = {};
  if (breakdown) {
    for (const t of breakdown.types || []) typeCountMap[t.type] = t.count;
    for (const d of breakdown.difficulties || []) diffCountMap[d.difficulty] = d.count;
  }

  useEffect(() => {
    if (availableTypes.length > 0) {
      const mapped = availableTypes.map((t: string) => {
        const found = QUESTION_MODELS.find((m) => m.value === t || (t === 'mcq' && m.value === 'multiple_choice'));
        return found ? found.value : null;
      }).filter(Boolean) as string[];
      setSelectedModels(mapped.length > 0 ? mapped : availableTypes);
    }
  }, [availableTypes]);

  const TYPE_MAP: Record<string, string[]> = { multiple_choice: ['mcq', 'multiple_choice'] };

  useEffect(() => {
    if (selectedModels.length === 0 || questionCount === 0) {
      const empty = { mcq: 0, true_false: 0, fill_blank: 0, short_answer: 0, matching: 0 };
      setQuizDistribution({ easy: { ...empty }, medium: { ...empty }, hard: { ...empty }, hots: { ...empty } });
      return;
    }
    const backendTypes = selectedModels.map((m: string) => (TYPE_MAP[m] || [m])[0]);
    const numTypes = backendTypes.length;
    const numDiffs = 4;
    const totalCells = numTypes * numDiffs;
    const perCell = Math.floor(questionCount / totalCells);
    let remainder = questionCount - perCell * totalCells;
    const newDist: Record<string, Record<string, number>> = {
      easy: {}, medium: {}, hard: {}, hots: {},
    };
    const diffs = ['easy', 'medium', 'hard', 'hots'];
    for (const d of diffs) {
      for (const bt of backendTypes) {
        let val = perCell;
        if (remainder > 0) { val += 1; remainder -= 1; }
        newDist[d][bt] = val;
      }
    }
    for (const d of diffs) {
      for (const bt of backendTypes) {
        if (newDist[d][bt] === undefined) newDist[d][bt] = 0;
      }
    }
    setQuizDistribution(newDist);
    setReviewQuestions([]);
  }, [questionCount, selectedModels]);

  useEffect(() => {
    if (urlClassId && assignmentList.length > 0 && !selectedClassId) {
      const found = assignmentList.find((a) => a.classId === urlClassId);
      if (found) setSelectedClassId(urlClassId);
    }
  }, [urlClassId, assignmentList]);

  useEffect(() => {
    if (urlSubjectId && classAssignments.length > 0 && !selectedSubjectId) {
      const found = classAssignments.find((a) => a.subjectId === urlSubjectId);
      if (found) setSelectedSubjectId(urlSubjectId);
    }
  }, [urlSubjectId, classAssignments]);

  useEffect(() => {
    if (urlTextbookId && textbookList.length > 0) {
      const found = textbookList.find((tb: any) => tb.id === urlTextbookId);
      if (found) {
        setSelectedTextbookId(urlTextbookId);
      }
    }
  }, [urlTextbookId, textbookList]);

  useEffect(() => {
    if (urlChapterId && chapterList.length > 0) {
      const found = chapterList.find((ch: any) => ch.id === urlChapterId);
      if (found) {
        setSelectedChapterId(urlChapterId);
      }
    }
  }, [urlChapterId, chapterList]);

  useEffect(() => {
    if (urlConceptId && conceptList.length > 0) {
      const found = conceptList.find((c: any) => c.id === urlConceptId);
      if (found) {
        setSelectedConceptId(urlConceptId);
      }
    }
  }, [urlConceptId, conceptList]);

  const [reviewQuestions, setReviewQuestions] = useState<any[]>([]);
  const [reviewTitle, setReviewTitle] = useState('');
  const [generatingPreview, setGeneratingPreview] = useState(false);

  const createQuizMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/quizzes-v2', body).then((r) => r.data.data),
    onSuccess: () => {
      toast.success(_('Quiz created successfully'));
      queryClient.invalidateQueries({ queryKey: ['quizzes-v2-class', selectedClassId] });
      queryClient.invalidateQueries({ queryKey: ['student-quizzes-v2'] });
      queryClient.invalidateQueries({ queryKey: ['student-tasks'] });
      setReviewQuestions([]);
      setQuizTitle('');
      setTimeLimitMinutes(30);
      setQuestionCount(10);
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : _('Failed to create quiz');
      toast.error(message);
    },
  });

  const generatePreviewMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/quizzes-v2', body).then((r) => r.data.data),
    onSuccess: (data) => {
      if (data.questions?.length) {
        setQuizGeneratedPaper(data.questions);
        setReviewQuestions(data.questions);
        if (data.aiErrorMessage) {
          toast.error(_('AI Error') + `: ${data.aiErrorMessage}`);
        } else if (data.aiGeneratedCount === 0 && data.questions.length < (questionCount || 0)) {
          toast.error(_('AI generated 0 questions. Check GEMINI_API_KEY or quota.'));
        } else {
          toast.success(_('Preview') + `: ${data.questions.length} ${_('questions')} (${data.aiGeneratedCount ?? 0} AI)`);
        }
      }
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : _('Failed to generate preview');
      toast.error(message);
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/assignments-v2', body).then((r) => r.data.data),
    onSuccess: () => {
      toast.success(_('Assignment created successfully'));
      queryClient.invalidateQueries({ queryKey: ['assignments-v2-class', selectedClassId] });
      queryClient.invalidateQueries({ queryKey: ['student-tasks'] });
      setAssignmentTitle('');
      setAssignmentDescription('');
      setAssignmentQuestions([createEmptyQuestion()]);
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : _('Failed to create assignment');
      toast.error(message);
    },
  });

  const generateQuizPaperMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/exams-v2/generate-paper', {
        textbookId: selectedTextbookId,
        chapterId: selectedChapterId,
        classId: selectedClassId,
        distribution: quizDistribution,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Paper generated: ${data.questionCount} questions`);
      setQuizGeneratedPaper(data.questions);
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to generate paper';
      toast.error(msg);
    },
  });

  const createQuizFromPaperMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        title: quizTitle.trim(),
        classId: selectedClassId,
        subjectId: selectedAssignment?.subjectId,
        textbookId: selectedTextbookId,
        chapterId: selectedChapterId,
        conceptId: selectedConceptId,
        teacherId: user?.id ?? '',
        timeLimitMinutes,
        selectedModels,
        questionCount: (quizGeneratedPaper || []).length,
        passingScore: quizPassingScore,
        maxAttempts: quizMaxAttempts,
        shuffleQuestions: quizShuffle,
        questions: quizGeneratedPaper,
      };
      return api.post('/quizzes-v2', body).then((r) => r.data.data);
    },
    onSuccess: () => {
      toast.success(_('Quiz created from paper'));
      setQuizGeneratedPaper(null);
      queryClient.invalidateQueries({ queryKey: ['quizzes-v2-class', selectedClassId] });
      queryClient.invalidateQueries({ queryKey: ['student-quizzes-v2'] });
      queryClient.invalidateQueries({ queryKey: ['student-tasks'] });
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to create quiz';
      toast.error(msg);
    },
  });

  const setQuizDist = (difficulty: string, type: string, value: number) => {
    setReviewQuestions([]);
    setQuizDistribution((prev) => ({
      ...prev,
      [difficulty]: { ...prev[difficulty], [type]: Math.max(0, value || 0) },
    }));
  };

  const quizDistributionTotal = ['easy', 'medium', 'hard', 'hots'].reduce((sum, diff) =>
    sum + QUESTION_MODELS.filter(m => selectedModels.includes(m.value)).reduce((s, m) => {
      const t = m.value === 'multiple_choice' ? 'mcq' : m.value;
      return s + (quizDistribution[diff]?.[t] ?? 0);
    }, 0), 0);

  const generateAssignmentPaperMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/exams-v2/generate-paper', {
        textbookId: selectedTextbookId,
        chapterId: selectedChapterId,
        classId: selectedClassId,
        distribution: assignmentDistribution,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Assignment paper generated: ${data.questionCount} questions`);
      setAssignmentGeneratedPaper(data.questions);
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to generate paper';
      toast.error(msg);
    },
  });

  const createAssignmentFromPaperMutation = useMutation({
    mutationFn: async () => {
      const questionsPayload = (assignmentGeneratedPaper || []).map((q: any) => ({
        text: q.text || q.question,
        type: q.type === 'mcq' ? 'multiple_choice' : q.type === 'true_false' ? 'true_false' : q.type === 'fill_blank' ? 'fill_blank' : q.type === 'short_answer' ? 'short_answer' : q.type === 'matching' ? 'matching' : 'short_answer',
        points: q.points || 2,
        options: q.type === 'mcq' || q.type === 'multiple_choice' ? q.options : undefined,
        correctAnswer: q.correctAnswer || q.answer || '',
      }));
      return api.post('/assignments-v2', {
        title: assignmentTitle.trim(),
        description: assignmentDescription.trim(),
        classId: selectedClassId,
        textbookId: selectedTextbookId,
        chapterId: selectedChapterId,
        conceptId: selectedConceptId,
        teacherId: user?.id ?? '',
        timeLimitMinutes: assignmentTimeLimit,
        questions: questionsPayload,
        passingScore: assignmentPassingScore,
        maxAttempts: assignmentMaxAttempts,
        shuffleQuestions: assignmentShuffle,
      }).then((r) => r.data.data);
    },
    onSuccess: () => {
      toast.success(_('Assignment created from paper'));
      setAssignmentGeneratedPaper(null);
      queryClient.invalidateQueries({ queryKey: ['assignments-v2-class', selectedClassId] });
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to create assignment';
      toast.error(msg);
    },
  });

  const setAssignmentDist = (difficulty: string, type: string, value: number) => {
    setAssignmentDistribution((prev) => ({
      ...prev,
      [difficulty]: { ...prev[difficulty], [type]: Math.max(0, value || 0) },
    }));
  };

  const assignmentDistributionTotal = ['easy', 'medium', 'hard', 'hots'].reduce((sum, diff) =>
    sum + ASSIGNMENT_QUESTION_TYPES.filter(m => selectedModels.includes(m.value)).reduce((s, m) => {
      const t = m.value === 'multiple_choice' ? 'mcq' : m.value;
      return s + (assignmentDistribution[diff]?.[t] ?? 0);
    }, 0), 0);

  const resetQuizForm = useCallback(() => {
    setQuizTitle('');
    setQuizDescription('');
    setSelectedModels(['multiple_choice', 'true_false']);
    setTimeLimitMinutes(30);
    setQuestionCount(10);
    setQuizPassingScore(50);
    setQuizMaxAttempts(3);
    setQuizShuffle(true);
  }, []);

  const resetAssignmentForm = useCallback(() => {
    setAssignmentTitle('');
    setAssignmentDescription('');
    setAssignmentTimeLimit(60);
    setAssignmentQuestions([createEmptyQuestion()]);
    setAssignmentPassingScore(50);
    setAssignmentMaxAttempts(3);
    setAssignmentShuffle(true);
  }, []);

  const handleCreateQuiz = useCallback(() => {
    if (!selectedAssignment || !selectedTextbookId || !selectedChapterId || !selectedConceptId) {
      toast.error(_('Please select a class, textbook, chapter, and concept'));
      return;
    }
    if (!quizTitle.trim()) {
      toast.error(_('Please enter a quiz title'));
      return;
    }
    if (selectedModels.length === 0) {
      toast.error(_('Please select at least one question model'));
      return;
    }
    if (questionCount < 1) {
      toast.error(_('Question count must be at least 1'));
      return;
    }

    const body: Record<string, unknown> = {
      title: quizTitle.trim(),
      description: quizDescription.trim(),
      classId: selectedClassId,
      subjectId: selectedAssignment?.subjectId,
      textbookId: selectedTextbookId,
      chapterId: selectedChapterId,
      conceptId: selectedConceptId,
      teacherId: user?.id ?? '',
      timeLimitMinutes,
      selectedModels,
      questionCount,
      passingScore: quizPassingScore,
      maxAttempts: quizMaxAttempts,
      shuffleQuestions: quizShuffle,
      publishedTo: publishScope,
      targetStudentIds: publishScope === 'students' ? selectedStudentIds : [],
      difficultyDistribution: quizDistribution,
    };

    if (reviewQuestions.length > 0) {
      body.questions = reviewQuestions;
      body.questionCount = reviewQuestions.length;
    }

    createQuizMutation.mutate(body);
  }, [
    selectedAssignment, selectedTextbookId, selectedChapterId, selectedConceptId,
    quizTitle, selectedModels, timeLimitMinutes, questionCount,
    quizPassingScore, quizMaxAttempts, quizShuffle, selectedClassId, user?.id,
    createQuizMutation, reviewQuestions, publishScope, selectedStudentIds, quizDistribution,
  ]);

  const handleCreateAssignment = useCallback(() => {
    if (!selectedAssignment || !selectedTextbookId || !selectedChapterId || !selectedConceptId) {
      toast.error(_('Please select a class, textbook, chapter, and concept'));
      return;
    }
    if (!assignmentTitle.trim()) {
      toast.error(_('Please enter an assignment title'));
      return;
    }
    const validQuestions = assignmentQuestions.filter((q) => q.text.trim());
    if (validQuestions.length === 0) {
      toast.error(_('Please add at least one question with text'));
      return;
    }

    const questionsPayload = validQuestions.map((q) => ({
      text: q.text.trim(),
      type: q.type,
      points: q.points,
      options: q.type === 'multiple_choice' ? q.options.filter((o) => o.trim()) : undefined,
      correctAnswer: q.correctAnswer.trim(),
    }));

    createAssignmentMutation.mutate({
      title: assignmentTitle.trim(),
      description: assignmentDescription.trim(),
      classId: selectedClassId,
      textbookId: selectedTextbookId,
      chapterId: selectedChapterId,
      conceptId: selectedConceptId,
      teacherId: user?.id ?? '',
      timeLimitMinutes: assignmentTimeLimit,
      questions: questionsPayload,
      passingScore: assignmentPassingScore,
      maxAttempts: assignmentMaxAttempts,
      shuffleQuestions: assignmentShuffle,
      publishedTo: publishScope,
      targetStudentIds: publishScope === 'students' ? selectedStudentIds : [],
    });
  }, [
    selectedAssignment, selectedTextbookId, selectedChapterId, selectedConceptId,
    assignmentTitle, assignmentDescription, assignmentQuestions,
    assignmentTimeLimit, assignmentPassingScore, assignmentMaxAttempts, assignmentShuffle,
    selectedClassId, user?.id, createAssignmentMutation, publishScope, selectedStudentIds,
  ]);

  const handleModelToggle = useCallback((model: string) => {
    setReviewQuestions([]);
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model],
    );
  }, []);

  const updateAssignmentQuestion = useCallback((id: string, field: keyof AssignmentQuestion, value: unknown) => {
    setAssignmentQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const updated = { ...q, [field]: value };
        if (field === 'type' && value !== 'multiple_choice') {
          updated.options = [];
        }
        if (field === 'type' && value === 'multiple_choice' && q.options.length === 0) {
          updated.options = [''];
        }
        return updated;
      }),
    );
  }, []);

  const addAssignmentQuestion = useCallback(() => {
    setAssignmentQuestions((prev) => [...prev, createEmptyQuestion()]);
  }, []);

  const removeAssignmentQuestion = useCallback((id: string) => {
    setAssignmentQuestions((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((q) => q.id !== id);
    });
  }, []);

  const updateOption = useCallback((questionId: string, optionIndex: number, value: string) => {
    setAssignmentQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const options = [...q.options];
        options[optionIndex] = value;
        return { ...q, options };
      }),
    );
  }, []);

  const addOption = useCallback((questionId: string) => {
    setAssignmentQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        return { ...q, options: [...q.options, ''] };
      }),
    );
  }, []);

  const removeOption = useCallback((questionId: string, optionIndex: number) => {
    setAssignmentQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const options = q.options.filter((_, i) => i !== optionIndex);
        return { ...q, options: options.length === 0 ? [''] : options };
      }),
    );
  }, []);

  if (assignmentsLoading) {
    return (
      <>
        <SEOHead title={_('Create Assessment')} description={_('Create quizzes and assignments for your class')} canonical="/teacher/assessments/create" />
        <div className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-16">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-10 w-full mt-4" />
          <Skeleton className="h-10 w-full mt-2" />
          <Skeleton className="h-64 w-full mt-6" />
          <Skeleton className="h-48 w-full mt-4" />
        </div>
      </>
    );
  }

  if (assignmentsError) {
    return (
      <>
        <SEOHead title="Create Assessment" description="Create quizzes and assignments for your class" canonical="/teacher/assessments/create" />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-16">
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-border/60">
              <CardContent className="p-5 text-center space-y-4">
                <Icon name="error_outline" size={48} className="text-destructive mx-auto" />
                <p className="text-muted-foreground">{_('Failed to load your assignments. Please try again.')}</p>
                  <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['teacher-assignments', user?.id] })}>
                    {_('Retry')}
                  </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </>
    );
  }

  if (assignmentList.length === 0) {
    return (
      <>
        <SEOHead title="Create Assessment" description="Create quizzes and assignments for your class" canonical="/teacher/assessments/create" />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sm:p-6 p-4 max-w-4xl mx-auto pb-32 space-y-16">
          <motion.div variants={cardStackReveal} custom={0}>
            <h1 className="text-headline-sm">{_('Create Assessment')}</h1>
            <p className="text-body-md text-muted-foreground">{_('Create quizzes and assignments for your class')}</p>
          </motion.div>
          <motion.div variants={cardStackReveal} custom={0}>
            <Card className="border-border/60">
              <CardContent className="p-5 text-center space-y-4">
                <Icon name="school" size={48} className="text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  {_('You haven\'t been assigned to any class/subject yet. Contact your administrator.')}
                </p>
                <Button variant="outline" onClick={() => window.history.back()}>
                  {_('Go Back')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </>
    );
  }

  return (
    <>
      <SEOHead title="Quizzes & Tasks" description="Create and manage quizzes, assignments, and exams" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-6"
      >
        <motion.div variants={cardStackReveal} custom={0}>
          <div>
            <h1 className="text-headline-sm">{_('Quizzes & Tasks')}</h1>
            <p className="text-body-md text-muted-foreground">{_('Create and manage assessments')}</p>
          </div>
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
                    setSelectedConceptId('');
                    resetQuizForm();
                    resetAssignmentForm();
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">{_('Select a class...')}</option>
                  {[...new Map(assignmentList.map((a) => [a.classId, a]))].map(([_, a]) => (
                    <option key={a.classId} value={a.classId}>{a.className}</option>
                  ))}
                </select>
              </div>

              {classAssignments.length > 0 && (
                <div>
                  <Label className="mb-2 block">{_('Subject')}</Label>
                  {classAssignments.length === 1 ? (
                    <div className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                      {classAssignments[0].subjectName}
                    </div>
                  ) : (
                    <select
                      value={selectedSubjectId || classAssignments[0]?.subjectId || ''}
                      onChange={(e) => {
                        setSelectedSubjectId(e.target.value);
                        setSelectedTextbookId('');
                        setSelectedChapterId('');
                        setSelectedConceptId('');
                        resetQuizForm();
                        resetAssignmentForm();
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {classAssignments.map((a) => (
                        <option key={a.id} value={a.subjectId}>{a.subjectName}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {selectedAssignment && (
                <div>
                  <Label className="mb-2 block">{_('Textbook')}</Label>
                  {textbooksLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : textbookList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{_('No textbooks available for this subject')}</p>
                  ) : (
                    <select
                      value={selectedTextbookId}
                      onChange={(e) => {
                        setSelectedTextbookId(e.target.value);
                        setSelectedChapterId('');
                        setSelectedConceptId('');
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">{_('Select a textbook...')}</option>
                      {textbookList.map((tb) => (
                        <option key={tb.id} value={tb.id}>{tb.title}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {selectedTextbookId && (
                <div>
                  <Label className="mb-2 block">{_('Chapter')}</Label>
                  {chaptersLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : chapterList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{_('No chapters found in this textbook')}</p>
                  ) : (
                    <select
                      value={selectedChapterId}
                      onChange={(e) => {
                        setSelectedChapterId(e.target.value);
                        setSelectedConceptId('');
                      }}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">{_('Select a chapter...')}</option>
                      {chapterList.map((ch) => (
                        <option key={ch.id} value={ch.id}>{_('Chapter')} {ch.order + 1}: {ch.title}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {selectedChapterId && (
                <div>
                  <Label className="mb-2 block">{_('Concept')}</Label>
                  {conceptsLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : conceptList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{_('No concepts found in this chapter')}</p>
                  ) : (
                    <select
                      value={selectedConceptId}
                      onChange={(e) => setSelectedConceptId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">{_('Select a concept...')}</option>
                      {conceptList.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  )}
                  {selectedConceptId && conceptList.find((c: any) => c.id === selectedConceptId)?.questionBank?.length === 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">{_('No questions available for this concept.')}</p>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="assignment" size={16} className="text-primary" />
                  <span className="text-title-sm">{_('Assessment Type')}</span>
                </div>
                <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/50">
                  <button
                    type="button"
                    onClick={() => setAssessmentType('quiz')}
                    className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
                      assessmentType === 'quiz'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon name="quiz" size={14} className="inline mr-1.5 align-text-bottom" />
                    {_('Quiz')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssessmentType('assignment')}
                    className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
                      assessmentType === 'assignment'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon name="note_alt" size={14} className="inline mr-1.5 align-text-bottom" />
                    {_('Assignment')}
                  </button>
                </div>
              </div>

              {assessmentType === 'quiz' ? (
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="quiz-title" className="mb-2 block">{_('Quiz Title')}</Label>
                    <Input
                      id="quiz-title"
                      value={quizTitle}
                      onChange={(e) => setQuizTitle(e.target.value)}
                      placeholder={_('e.g. Algebra Basics Quiz')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="quiz-description" className="mb-2 block">{_('Description')}</Label>
                    <Textarea
                      id="quiz-description"
                      value={quizDescription}
                      onChange={(e) => setQuizDescription(e.target.value)}
                      placeholder={_('Provide instructions or context for this quiz')}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quiz-time-limit" className="mb-2 block">{_('Time Limit (minutes)')}</Label>
                      <Input
                        id="quiz-time-limit"
                        type="number"
                        min={1}
                        value={timeLimitMinutes}
                        onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="quiz-question-count" className="mb-2 block">{_('Question Count')}</Label>
                      <Input
                        id="quiz-question-count"
                        type="number"
                        min={1}
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="quiz-passing-score" className="mb-2 block">{_('Passing Score (%)')}</Label>
                      <Input
                        id="quiz-passing-score"
                        type="number"
                        min={0}
                        max={100}
                        value={quizPassingScore}
                        onChange={(e) => setQuizPassingScore(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="quiz-max-attempts" className="mb-2 block">{_('Max Attempts')}</Label>
                      <Input
                        id="quiz-max-attempts"
                        type="number"
                        min={1}
                        value={quizMaxAttempts}
                        onChange={(e) => setQuizMaxAttempts(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Switch checked={quizShuffle} onCheckedChange={setQuizShuffle} />
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
                      {QUESTION_MODELS.map((model) => {
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
                              onCheckedChange={() => handleModelToggle(model.value)}
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
                            Auto-distributed equally across difficulties. Adjust cells manually as needed.
                          </p>
                          <div className="flex items-center gap-2">
                            <p className={`text-xs font-semibold ${quizDistributionTotal !== questionCount ? 'text-destructive' : ''}`}>
                              Total: {quizDistributionTotal} / {questionCount} questions
                            </p>
                            {selectedModels.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (selectedModels.length === 0 || questionCount === 0) return;
                                  setReviewQuestions([]);
                                  const backendTypes = selectedModels.map((m: string) => (TYPE_MAP[m] || [m])[0]);
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
                                  setQuizDistribution(newDist);
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
                            const quizActiveTypes = QUESTION_MODELS.filter(m => selectedModels.includes(m.value));
                            return (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border/60">
                                    <th className="text-left py-2 pr-3">Difficulty</th>
                                    {quizActiveTypes.map((m) => (
                                      <th key={m.value} className="text-center px-2 py-2">{m.label}</th>
                                    ))}
                                    <th className="text-center px-2 py-2">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {['easy', 'medium', 'hard', 'hots'].map((diff) => (
                                    <tr key={diff} className="border-b border-border/40">
                                      <td className={`py-2 pr-3 font-medium capitalize ${diff === 'hots' ? 'text-purple-600' : ''}`}>{diff}</td>
                                      {quizActiveTypes.map((m) => {
                                        const mappedType = m.value === 'multiple_choice' ? 'mcq' : m.value;
                                        const avail = typeCountMap[mappedType] || 0;
                                        return (
                                          <td key={m.value} className="text-center px-1 py-1">
                                            <input
                                              type="number"
                                              min={0}
                                              max={avail}
                                              value={quizDistribution[diff]?.[mappedType] ?? 0}
                                              onChange={(e) => setQuizDist(diff, mappedType, parseInt(e.target.value) || 0)}
                                              className="w-14 text-center rounded border border-border bg-background px-1 py-1 text-xs"
                                            />
                                            <div className="text-[10px] text-muted-foreground">/ {avail}</div>
                                          </td>
                                        );
                                      })}
                                      <td className="text-center px-2 py-2 font-semibold">
                                        {quizActiveTypes.reduce((sum, m) => {
                                          const t = m.value === 'multiple_choice' ? 'mcq' : m.value;
                                          return sum + (quizDistribution[diff]?.[t] ?? 0);
                                        }, 0)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            );
                          })()}
                        </div>

                        {quizDistributionTotal > questionCount && (
                          <p className="text-xs text-red-500">Total exceeds question count by {quizDistributionTotal - questionCount}</p>
                        )}

                        <div className="flex items-center justify-end gap-2">
                          {quizGeneratedPaper && (
                            <Button size="sm" variant="outline" onClick={() => setQuizGeneratedPaper(null)}>
                              Clear Preview
                            </Button>
                          )}
                        </div>

                        {quizGeneratedPaper && (
                          <div className="border rounded-lg p-3 bg-background space-y-3 max-h-80 overflow-y-auto">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-primary">Preview ({quizGeneratedPaper.length} questions)</p>
                              {quizGeneratedPaper.length < questionCount && (
                                <p className="text-[10px] text-amber-600">Warning: fewer questions than requested</p>
                              )}
                            </div>
                            {quizGeneratedPaper.map((q: any, i: number) => (
                              <div key={q.id || i} className="rounded-lg border border-border/60 p-3 space-y-1.5">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">{q.type?.replace(/_/g, ' ')}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${q.difficulty === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : q.difficulty === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : q.difficulty === 'hard' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>{q.difficulty}</span>
                                  {q.hots && <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold">HOTS</span>}
                                </div>
                                <p className="text-xs text-foreground leading-relaxed">{q.text}</p>
                                {q.options && q.options.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {q.options.map((opt: string, oi: number) => (
                                      <span key={oi} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{String.fromCharCode(65 + oi)}. {opt}</span>
                                    ))}
                                  </div>
                                )}
                                {q.correctAnswer && (
                                  <p className="text-[10px] text-green-600 dark:text-green-400 font-medium">Answer: {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      size="lg"
                      onClick={() => {
                        if (!selectedConceptId) {
                          toast.error(_('Please select a concept first'));
                          return;
                        }
                        generatePreviewMutation.mutate({
                          title: quizTitle.trim() || 'Preview',
                          classId: selectedClassId,
                          subjectId: selectedAssignment?.subjectId,
                          textbookId: selectedTextbookId,
                          chapterId: selectedChapterId,
                          conceptId: selectedConceptId,
                          teacherId: user?.id ?? '',
                          timeLimitMinutes,
                          selectedModels,
                          questionCount,
                          preview: true,
                          difficultyDistribution: quizDistribution,
                        });
                      }}
                      disabled={generatePreviewMutation.isPending || !quizTitle.trim()}
                    >
                      {generatePreviewMutation.isPending ? (
                        <>{_('Generating...')}</>
                      ) : (
                        <><Icon name="visibility" size={18} />{_('Preview')}</>
                      )}
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      size="lg"
                      onClick={handleCreateQuiz}
                      disabled={
                        createQuizMutation.isPending ||
                        !selectedClassId ||
                        !selectedTextbookId ||
                        !selectedChapterId ||
                        !selectedConceptId ||
                        !quizTitle.trim()
                      }
                    >
                      {createQuizMutation.isPending ? (
                        <>
                          <Icon name="hourglass_top" size={18} className="animate-spin" />
                          {_('Creating Quiz...')}
                        </>
                      ) : (
                        <>
                          <Icon name="quiz" size={18} />
                          {_('Create Quiz')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="assignment-title" className="mb-2 block">{_('Assignment Title')}</Label>
                    <Input
                      id="assignment-title"
                      value={assignmentTitle}
                      onChange={(e) => setAssignmentTitle(e.target.value)}
                      placeholder={_('e.g. Algebra Practice Problems')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="assignment-description" className="mb-2 block">{_('Description')}</Label>
                    <Textarea
                      id="assignment-description"
                      value={assignmentDescription}
                      onChange={(e) => setAssignmentDescription(e.target.value)}
                      placeholder={_('Provide instructions or context for this assignment')}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="assignment-time-limit" className="mb-2 block">{_('Time Limit (minutes)')}</Label>
                    <Input
                      id="assignment-time-limit"
                      type="number"
                      min={1}
                      value={assignmentTimeLimit}
                      onChange={(e) => setAssignmentTimeLimit(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-title-sm">{_('Questions')}</Label>
                      <Button variant="outline" size="sm" onClick={addAssignmentQuestion}>
                        <Icon name="add" size={14} className="mr-1" />
                        {_('Add Question')}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {assignmentQuestions.map((question, index) => (
                        <Card key={question.id} className="border-border/60">
                          <CardContent className="p-5 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-label-xs font-semibold text-muted-foreground">
                                {_('Question')} {index + 1}
                              </span>
                              {assignmentQuestions.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => removeAssignmentQuestion(question.id)}
                                >
                                  <Icon name="close" size={14} className="text-muted-foreground" />
                                </Button>
                              )}
                            </div>

                            <div>
                              <Label className="mb-1 block text-label-xs">{_('Question Text')}</Label>
                              <Input
                                value={question.text}
                                onChange={(e) => updateAssignmentQuestion(question.id, 'text', e.target.value)}
                                placeholder={_('Enter your question')}
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label className="mb-1 block text-label-xs">{_('Type')}</Label>
                                <select
                                  value={question.type}
                                  onChange={(e) => updateAssignmentQuestion(question.id, 'type', e.target.value)}
                                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                  {ASSIGNMENT_QUESTION_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <Label className="mb-1 block text-label-xs">{_('Points')}</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={question.points}
                                  onChange={(e) => updateAssignmentQuestion(question.id, 'points', Number(e.target.value))}
                                />
                              </div>
                            </div>

                            {question.type === 'multiple_choice' && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <Label className="text-label-xs">{_('Options')}</Label>
                                  <Button variant="ghost" size="icon-sm" onClick={() => addOption(question.id)}>
                                    <Icon name="add_circle" size={14} className="text-primary" />
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  {question.options.map((opt, oi) => (
                                    <div key={oi} className="flex items-center gap-2">
                                      <span className="text-label-xs font-medium text-muted-foreground w-5">
                                        {String.fromCharCode(65 + oi)}.
                                      </span>
                                      <Input
                                        value={opt}
                                        onChange={(e) => updateOption(question.id, oi, e.target.value)}
                                        placeholder={_('Option') + ` ${String.fromCharCode(65 + oi)}`}
                                        className="flex-1"
                                      />
                                      {question.options.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => removeOption(question.id, oi)}
                                          className="text-muted-foreground hover:text-destructive"
                                        >
                                          <Icon name="remove_circle" size={14} />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div>
                              <Label className="mb-1 block text-label-xs">{_('Correct Answer')}</Label>
                              {question.type === 'multiple_choice' ? (
                                <select
                                  value={question.correctAnswer}
                                  onChange={(e) => updateAssignmentQuestion(question.id, 'correctAnswer', e.target.value)}
                                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                  <option value="">{_('Select correct option...')}</option>
                                  {question.options.map((opt, oi) => (
                                    <option key={oi} value={opt}>
                                      {opt || _('Option') + ` ${String.fromCharCode(65 + oi)}`}
                                    </option>
                                  ))}
                                </select>
                              ) : question.type === 'true_false' ? (
                                <select
                                  value={question.correctAnswer}
                                  onChange={(e) => updateAssignmentQuestion(question.id, 'correctAnswer', e.target.value)}
                                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                  <option value="">{_('Select...')}</option>
                                  <option value="true">{_('True')}</option>
                                  <option value="false">{_('False')}</option>
                                </select>
                              ) : (
                                <Input
                                  value={question.correctAnswer}
                                  onChange={(e) => updateAssignmentQuestion(question.id, 'correctAnswer', e.target.value)}
                                  placeholder={_('Enter the correct answer')}
                                />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="assignment-passing-score" className="mb-2 block">{_('Passing Score (%)')}</Label>
                      <Input
                        id="assignment-passing-score"
                        type="number"
                        min={0}
                        max={100}
                        value={assignmentPassingScore}
                        onChange={(e) => setAssignmentPassingScore(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="assignment-max-attempts" className="mb-2 block">{_('Max Attempts')}</Label>
                      <Input
                        id="assignment-max-attempts"
                        type="number"
                        min={1}
                        value={assignmentMaxAttempts}
                        onChange={(e) => setAssignmentMaxAttempts(Number(e.target.value))}
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <Switch checked={assignmentShuffle} onCheckedChange={setAssignmentShuffle} />
                        <div>
                          <span className="text-sm font-medium">{_('Shuffle Questions')}</span>
                          <p className="text-label-xs text-muted-foreground">{_('Randomize question order for each student')}</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {selectedChapterId && (
                    <div className="border-t border-border/60 pt-4">
                      <div className="space-y-3 p-4 rounded-lg border border-border/60 bg-muted/20 mb-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Auto-distributed equally across difficulties. Adjust cells manually as needed.
                          </p>
                          <p className="text-xs font-semibold">Total: {assignmentDistributionTotal} questions</p>
                        </div>
                        <div className="overflow-x-auto">
                          {(() => {
                            const assignActiveTypes = ASSIGNMENT_QUESTION_TYPES.filter(m => selectedModels.includes(m.value));
                            return (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border/60">
                                    <th className="text-left py-2 pr-3">Difficulty</th>
                                    {assignActiveTypes.map((m) => (
                                      <th key={m.value} className="text-center px-2 py-2">{m.label}</th>
                                    ))}
                                    <th className="text-center px-2 py-2">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {['easy', 'medium', 'hard', 'hots'].map((diff) => (
                                    <tr key={diff} className="border-b border-border/40">
                                      <td className={`py-2 pr-3 font-medium capitalize ${diff === 'hots' ? 'text-purple-600' : ''}`}>{diff}</td>
                                      {assignActiveTypes.map((m) => {
                                        const mappedType = m.value === 'multiple_choice' ? 'mcq' : m.value;
                                        const avail = typeCountMap[mappedType] || 0;
                                        return (
                                          <td key={m.value} className="text-center px-1 py-1">
                                            <input
                                              type="number"
                                              min={0}
                                              max={avail}
                                              value={assignmentDistribution[diff]?.[mappedType] ?? 0}
                                              onChange={(e) => setAssignmentDist(diff, mappedType, parseInt(e.target.value) || 0)}
                                              className="w-14 text-center rounded border border-border bg-background px-1 py-1 text-xs"
                                            />
                                            <div className="text-[10px] text-muted-foreground">/ {avail}</div>
                                          </td>
                                        );
                                      })}
                                      <td className="text-center px-2 py-2 font-semibold">
                                        {assignActiveTypes.reduce((sum, m) => {
                                          const t = m.value === 'multiple_choice' ? 'mcq' : m.value;
                                          return sum + (assignmentDistribution[diff]?.[t] ?? 0);
                                        }, 0)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            );
                          })()}
                        </div>

                        {assignmentDistributionTotal > questionCount && (
                          <p className="text-xs text-red-500">Total exceeds question count by {assignmentDistributionTotal - questionCount}</p>
                        )}

                        <div className="flex items-center justify-end gap-2">
                          {assignmentGeneratedPaper && (
                            <Button size="sm" variant="outline" onClick={() => setAssignmentGeneratedPaper(null)}>
                              Clear Preview
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => generateAssignmentPaperMutation.mutate()}
                            loading={generateAssignmentPaperMutation.isPending}
                            disabled={assignmentDistributionTotal === 0}
                            className="gap-1"
                          >
                            <Icon name="auto_awesome" size={14} />
                            {assignmentGeneratedPaper ? 'Regenerate' : 'Generate Paper'}
                          </Button>
                        </div>

                        {assignmentGeneratedPaper && (
                          <div className="border rounded-lg p-3 bg-background space-y-3 max-h-80 overflow-y-auto">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-primary">Preview ({assignmentGeneratedPaper.length} questions)</p>
                              {assignmentGeneratedPaper.length < questionCount && (
                                <p className="text-[10px] text-amber-600">Warning: fewer questions than requested</p>
                              )}
                            </div>
                            {assignmentGeneratedPaper.map((q: any, i: number) => (
                              <div key={q.id || i} className="rounded-lg border border-border/60 p-3 space-y-1.5">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">{q.type?.replace(/_/g, ' ')}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${q.difficulty === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : q.difficulty === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : q.difficulty === 'hard' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>{q.difficulty}</span>
                                  {q.hots && <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold">HOTS</span>}
                                </div>
                                <p className="text-xs text-foreground leading-relaxed">{q.text}</p>
                                {q.options && q.options.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {q.options.map((opt: string, oi: number) => (
                                      <span key={oi} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{String.fromCharCode(65 + oi)}. {opt}</span>
                                    ))}
                                  </div>
                                )}
                                {q.correctAnswer && (
                                  <p className="text-[10px] text-green-600 dark:text-green-400 font-medium">Answer: {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {assignmentGeneratedPaper ? (
                    <Button
                      className="w-full gap-2"
                      size="lg"
                      onClick={() => createAssignmentFromPaperMutation.mutate()}
                      loading={createAssignmentFromPaperMutation.isPending}
                    >
                      <Icon name="note_alt" size={18} />
                      Create Assignment from Paper
                    </Button>
                  ) : (
                    <Button
                      className="w-full gap-2"
                      size="lg"
                      onClick={handleCreateAssignment}
                      disabled={
                        createAssignmentMutation.isPending ||
                        !selectedClassId ||
                        !selectedTextbookId ||
                        !selectedChapterId ||
                        !selectedConceptId ||
                        !assignmentTitle.trim()
                      }
                    >
                      {createAssignmentMutation.isPending ? (
                        <>
                          <Icon name="hourglass_top" size={18} className="animate-spin" />
                          {_('Creating Assignment...')}
                        </>
                      ) : (
                        <>
                          <Icon name="note_alt" size={18} />
                          {_('Create Assignment')}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

      </motion.div>
    </>
  );
}
