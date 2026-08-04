import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Brain } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sendChatMessage, pushQuiz, pushAssignment } from '@/services/ocrService';
import { teacherClassSubjectService } from '@/services/teacherClassSubjectService';
import { useClasses } from '@/hooks/useClasses';
import { formatClassName } from '@/services/classService';
import api from '@/services/api';
import LatexRenderer from '@/components/common/LatexRenderer';
import { useAuthStore } from '@/store/authStore';
import { useChatStore, ChatMsg } from '@/store/chatStore';
import AssistantCameraCapture from '@/components/ocr/AssistantCameraCapture';


function QuizView({ data, onPush }: { data: any; onPush: (d: any, cls: string, meta: { title: string; subjectId: string; questions: any[]; studentIds: string[] }) => Promise<void> }) {
  const { _ } = useTranslation();
  const [selectedClass, setSelectedClass] = useState('');
  const [testName, setTestName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [pushMode, setPushMode] = useState<'class' | 'students'>('class');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [pushing, setPushing] = useState(false);
  const [questions, setQuestions] = useState<any[]>(() =>
    (data?.questions || []).map((q: any) => ({
      id: q.id || `q_${Math.random().toString(36).slice(2, 9)}`,
      type: q.type || 'short_answer',
      question: q.question || q.text || '',
      options: Array.isArray(q.options) ? [...q.options] : [],
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'medium',
      points: Number(q.points) || 1,
    })),
  );
  const { data: myAssignments = [] } = useQuery({
    queryKey: ['my-class-subjects'],
    queryFn: () => teacherClassSubjectService.getMyAssignments().then((r) => r.data),
  });

  const { data: classes = [] } = useClasses();

  const { data: roster = [] } = useQuery({
    queryKey: ['class-roster-ocr', selectedClass],
    enabled: !!selectedClass && pushMode === 'students',
    queryFn: () =>
      api.get(`/classes/${selectedClass}/roster`).then((r) =>
        (r.data.data ?? []).filter((u: any) => u.role === 'student'),
      ),
  });

  const myClasses = classes.map((c) => ({ id: c.id, name: formatClassName(c) }));

  const mySubjects = useMemo(() => {
    if (!selectedClass) return [];
    const seen = new Map<string, string>();
    for (const a of myAssignments) {
      if (a.classId === selectedClass && a.subjectId) seen.set(a.subjectId, a.subjectName || a.subjectId);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [myAssignments, selectedClass]);

  const updateQuestion = (i: number, patch: Record<string, unknown>) => {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  };
  const updateOption = (qi: number, oi: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qi ? { ...q, options: q.options.map((o: string, j: number) => (j === oi ? value : o)) } : q,
      ),
    );
  };
  const addOption = (qi: number) => {
    setQuestions((prev) => prev.map((q, idx) => (idx === qi ? { ...q, options: [...q.options, ''] } : q)));
  };
  const removeOption = (qi: number, oi: number) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === qi ? { ...q, options: q.options.filter((_: string, j: number) => j !== oi) } : q)),
    );
  };
  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const pushDisabled = !selectedClass || !subjectId || !testName.trim() || (pushMode === 'students' && selectedStudentIds.length === 0) || pushing;

  const handlePush = () => {
    setPushing(true);
    onPush(data, selectedClass, {
      title: testName,
      subjectId,
      questions: questions.map((q) => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        points: Number(q.points) || 1,
      })),
      studentIds: pushMode === 'students' ? selectedStudentIds : [],
    }).finally(() => setPushing(false));
  };

  return (
    <div className="space-y-3 mt-2">
      <p className="text-sm font-semibold text-primary">{_('Generated Quiz')} ({questions.length} {_('questions')})</p>
      <p className="text-[10px] text-muted-foreground">{_('You can edit the questions, marks and options before pushing.')}</p>

      {questions.map((q: any, i: number) => (
        <div key={q.id || i} className="p-3 rounded-lg border border-border/60 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground shrink-0">{i + 1}.</span>
            <Input value={q.question} onChange={(e) => updateQuestion(i, { question: e.target.value })} placeholder={_('Question text')} className="h-8 text-xs flex-1" />
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground">{_('Marks')}</span>
              <Input type="number" min={1} value={q.points} onChange={(e) => updateQuestion(i, { points: e.target.value })} className="h-8 w-16 text-center text-xs" />
            </div>
          </div>
          {q.options && q.options.length > 0 && (
            <div className="space-y-1 pl-6">
              {q.options.map((o: string, j: number) => (
                <div key={j} className="flex items-center gap-1.5">
                  <Input value={o} onChange={(e) => updateOption(i, j, e.target.value)} placeholder={`${_('Option')} ${j + 1}`} className="h-7 text-xs flex-1" />
                  <button type="button" onClick={() => removeOption(i, j)} className="text-muted-foreground hover:text-error text-sm shrink-0 px-1">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => addOption(i)} className="text-[10px] text-primary hover:underline">{_('+ Add option')}</button>
            </div>
          )}
          <div className="flex items-center gap-2 pl-6">
            <span className="text-[10px] text-muted-foreground shrink-0">{_('Correct answer')}</span>
            <Input value={q.correctAnswer} onChange={(e) => updateQuestion(i, { correctAnswer: e.target.value })} className="h-7 text-xs flex-1" />
          </div>
        </div>
      ))}

      <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2.5 mt-3">
        <p className="text-xs font-bold text-primary uppercase tracking-wider">{_('Test Details')}</p>
        <Input
          placeholder={_('Test name (e.g. Polynomials Quiz)')}
          value={testName}
          onChange={(e) => setTestName(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSubjectId(''); setSelectedStudentIds([]); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder={_('Select class...')} /></SelectTrigger>
            <SelectContent>
              {myClasses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="w-48"><SelectValue placeholder={_('Select subject...')} /></SelectTrigger>
            <SelectContent>
              {mySubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {myClasses.length === 0 ? (
          <p className="text-xs text-muted-foreground">{_('You have no allotted classes yet. Ask your admin to assign you to a class and subject.')}</p>
        ) : null}

        <div>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setPushMode('class')} className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${pushMode === 'class' ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface text-muted-foreground border-border/60'}`}>
              {_('Entire Class')}
            </button>
            <button type="button" onClick={() => setPushMode('students')} className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${pushMode === 'students' ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface text-muted-foreground border-border/60'}`}>
              {_('Select Students')}
            </button>
          </div>
          {pushMode === 'students' && (
            <div className="border border-border/50 rounded-lg p-2 max-h-44 overflow-y-auto space-y-1">
              {!selectedClass ? (
                <p className="text-xs text-muted-foreground">{_('Select a class first.')}</p>
              ) : roster.length === 0 ? (
                <p className="text-xs text-muted-foreground">{_('Loading students...')}</p>
              ) : (
                roster.map((s: any) => (
                  <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/40 px-1 rounded">
                    <input type="checkbox" checked={selectedStudentIds.includes(s.id)} onChange={() => toggleStudent(s.id)} className="accent-primary" />
                    <span className="truncate">{s.display_name || s.email}{s.roll_no ? ` (${s.roll_no})` : ''}</span>
                  </label>
                ))
              )}
            </div>
          )}
          {pushMode === 'students' && selectedStudentIds.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1">{selectedStudentIds.length} {_('student(s) selected')}</p>
          )}
        </div>

        <Button size="sm" className="w-full" onClick={handlePush} disabled={pushDisabled} loading={pushing}>
          <Icon name="send" size={14} className="mr-1" /> {pushing ? _('Pushing...') : _('Push to Quizzes')}
        </Button>
      </div>
    </div>
  );
}

function AssignmentView({ data, onPush }: { data: any; onPush: (d: any, cls: string) => Promise<void> }) {
  const { _ } = useTranslation();
  const [selectedClass, setSelectedClass] = useState('');
  const [pushing, setPushing] = useState(false);
  const { data: classes = [] } = useClasses();
  const myClasses = classes.map((c) => ({ id: c.id, name: formatClassName(c) }));
  return (
    <div className="space-y-3 mt-2">
      <p className="text-sm font-semibold text-primary">{data.title || _('Generated Assignment')}</p>
      {data.instructions && <p className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">{data.instructions}</p>}
      <ol className="list-decimal list-inside space-y-1">
        {(data.questions || []).slice(0, 5).map((q: string, i: number) => (
          <li key={i} className="text-sm">{q}</li>
        ))}
      </ol>
      <p className="text-xs font-medium">{_('Total Points:')} {data.totalPoints || 0}</p>
      <div className="flex items-center gap-2 mt-3">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-48"><SelectValue placeholder={_('Select class...')} /></SelectTrigger>
          <SelectContent>
            {myClasses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => { setPushing(true); onPush(data, selectedClass).finally(() => setPushing(false)); }} disabled={!selectedClass || pushing} loading={pushing}>
          <Icon name="send" size={14} className="mr-1" /> {pushing ? _('Pushing...') : _('Push to Assignments')}
        </Button>
      </div>
    </div>
  );
}

function MindMapView({ data, onView }: { data: any; onView: (d: any) => void }) {
  const { _ } = useTranslation();
  return (
    <div className="space-y-3 mt-2">
      <p className="text-sm font-semibold text-primary">{_('Mind Map:')} {data?.centralTopic || data?.topic || _('Generated')}</p>
      <div className="p-3 bg-muted/20 rounded-lg">
        <p className="text-xs font-medium mb-2">{_('Nodes:')}</p>
        <div className="space-y-1">
          {(data?.nodes || []).slice(0, 8).map((n: any, i: number) => (
            <div key={n.id || i} className="text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
              <span>{n.label || n.name}</span>
            </div>
          ))}
        </div>
      </div>
      <Button size="sm" onClick={() => onView(data)}>
        <Icon name="account_tree" size={14} className="mr-1" /> {_('View in Mind Maps')}
      </Button>
    </div>
  );
}

export default function TeacherOCRPage() {
  const { _ } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id || 'anonymous';
  const [inputMode, setInputMode] = useState<'text' | 'image' | 'camera'>('text');
  const [dropActive, setDropActive] = useState(false);
  
  const emptyMessages = useMemo(() => [] as ChatMsg[], []);
  const messages = useChatStore((s) => s.teacherOcrMessages[userId] || emptyMessages);
  const setTeacherOcrMessages = useChatStore((s) => s.setTeacherOcrMessages);
  const clearMessages = useChatStore((s) => s.clearTeacherOcrMessages);

  const setMessages = useCallback((action: React.SetStateAction<ChatMsg[]>) => {
    if (typeof action === 'function') {
      setTeacherOcrMessages(userId, action(messages));
    } else {
      setTeacherOcrMessages(userId, action);
    }
  }, [messages, userId, setTeacherOcrMessages]);

  useEffect(() => {
    if (messages.length === 0) {
      setTeacherOcrMessages(userId, [{ role: 'assistant', content: _('Hello! I\'m your AI teaching assistant. Upload textbook images and tell me what you\'d like to create — a quiz, assignment, mind map, or just ask a question!') }]);
    }
  }, [messages.length, userId, setTeacherOcrMessages]);
  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text && pendingFiles.length === 0) return;
    setInput('');

    const userMsg: ChatMsg = { role: 'user', content: text || _('Please process these images'), images: pendingImages.length > 0 ? [...pendingImages] : undefined };
    const files = [...pendingFiles];
    setPendingImages([]);
    setPendingFiles([]);

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setLoadingPhase(files.length > 0 ? _('OCR scanning...') : _('Generating...'));

    const timer = setTimeout(() => setLoadingPhase((p) => p === _('OCR scanning...') ? _('OCR still working...') : _('AI generating...')), 5000);
    const timer2 = setTimeout(() => setLoadingPhase(_('Almost done...')), 15000);

    try {
      const result = await sendChatMessage(
        [...messages.slice(1).map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: text || 'Please process these images' }],
        files,
      );
      const data = result.data || result;
      const reply = data.content || data.data?.message || data.data?.text || data.data?.response || data.data?.content || (typeof data === 'string' ? data : null) || _('Done!');
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, data }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: err?.message || _('Sorry, something went wrong. Please try again.') }]);
    } finally {
      clearTimeout(timer);
      clearTimeout(timer2);
      setIsLoading(false);
      setLoadingPhase('');
    }
  }, [input, pendingFiles, pendingImages, messages]);

  const addFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const urls = files.map((f) => URL.createObjectURL(f));
    setPendingImages((prev) => [...prev, ...urls]);
    setPendingFiles((prev) => [...prev, ...files]);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  }, [addFiles]);

  const removePending = useCallback((i: number) => {
    URL.revokeObjectURL(pendingImages[i]);
    setPendingImages((prev) => prev.filter((_, idx) => idx !== i));
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));
  }, [pendingImages]);

  const handleCameraCapture = useCallback((file: File) => {
    addFiles([file]);
    setInputMode('text');
  }, [addFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropActive(false);
    addFiles(Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/')));
  }, [addFiles]);

  const handleDeleteQuiz = useCallback(async (quizId: string) => {
    try {
      await api.delete(`/quizzes-v2/${quizId}`);
      setMessages((prev) => [...prev, { role: 'assistant', content: `🗑️ Quiz deleted successfully.` }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ Failed to delete quiz: ${err?.message || 'Unknown error'}` }]);
    }
  }, []);

  const handleRepublishQuiz = useCallback(async (quizId: string) => {
    setMessages((prev) => [...prev, { role: 'assistant', content: `⏳ Republishing quiz as interactive practice...` }]);
    try {
      await api.post(`/quizzes-v2/${quizId}/republish`);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `✅ Quiz republished as interactive practice mode! Students can now attempt with immediate feedback.`,
        data: { action: 'republished' }
      }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ Failed to republish: ${err?.message || 'Unknown error'}` }]);
    }
  }, []);

  const handlePushQuiz = useCallback(async (data: any, classId: string, meta: { title: string; subjectId: string; questions?: any[]; studentIds?: string[] }) => {
    setMessages((prev) => [...prev, { role: 'assistant', content: `⏳ Pushing quiz...` }]);
    try {
      const result = await pushQuiz(data, classId, meta);
      const target = meta.studentIds?.length ? `${meta.studentIds.length} student(s)` : 'class';
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `✅ Quiz "${result.title || 'Untitled'}" pushed to ${target}! (${meta.questions?.length || data.questions?.length || 0} questions)`,
        data: { pushedQuizId: result.id, action: 'pushed_quiz' }
      }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ Failed to push quiz: ${err?.message || 'Unknown error'}` }]);
    }
  }, []);

  const handlePushAssignment = useCallback(async (data: any, classId: string) => {
    setMessages((prev) => [...prev, { role: 'assistant', content: `⏳ Pushing assignment to class...` }]);
    try {
      const result = await pushAssignment(data, classId);
      setMessages((prev) => [...prev, { role: 'assistant', content: `✅ ${_('Assignment')} "${result.title || _('Untitled')}" ${_('pushed successfully!')}` }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ Failed to push assignment: ${err?.message || 'Unknown error'}` }]);
    }
  }, []);

  const handleViewMindMap = useCallback((data: any) => {
    setMessages((prev) => [...prev, { role: 'assistant', content: `✅ ${_('Mind map ready! Navigate to the Mind Maps section to view it. (Mind map rendering coming soon)')}` }]);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const renderContent = (msg: ChatMsg) => {
    if (!msg.data) return <LatexRenderer content={msg.content} className="text-body-md leading-relaxed" />;
    const action = msg.data.data?.action || msg.data.action;
    const payload = msg.data.data?.data || msg.data.data || msg.data;
    if (action === 'pushed_quiz' && msg.data.pushedQuizId) {
      return (
        <div className="space-y-2">
          <LatexRenderer content={msg.content} className="text-sm" />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-success border-success/30" onClick={() => handleRepublishQuiz(msg.data.pushedQuizId)}>
              <Brain className="h-4 w-4 mr-1" /> {_('Republish as Interactive Practice')}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleDeleteQuiz(msg.data.pushedQuizId)}>
              <Icon name="delete" size={14} className="mr-1" /> {_('Delete Quiz')}
            </Button>
          </div>
        </div>
      );
    }
    if (action === 'quiz' || payload?.questions) return <QuizView data={payload.questions ? payload : { questions: payload }} onPush={handlePushQuiz} />;
    if (action === 'assignment' || payload?.title) return <AssignmentView data={payload} onPush={handlePushAssignment} />;
    if (action === 'mindmap' || payload?.nodes || payload?.centralTopic) return <MindMapView data={payload} onView={handleViewMindMap} />;
    return <LatexRenderer content={msg.content} className="text-sm" />;
  };

  return (
    <>
      <SEOHead title={_('AI Teaching Assistant')} description={_('Chat with AI to create quizzes, assignments, and mind maps from textbook images')} />
      <div className="mx-auto flex h-[calc(100dvh-7.5rem)] w-full max-w-5xl flex-col px-3 py-4 sm:px-6 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-headline-md font-bold">{_('AI Teaching Assistant')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{_('Upload textbook images and tell me what to create — quiz, assignment, mind map, or ask a question')}</p>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden shadow-md min-h-0">
          <CardContent className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scroll-smooth">
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-md shadow-sm' : 'bg-card text-card-foreground rounded-bl-md border border-border/60 shadow-sm'}`}>
                  {msg.images && (
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {msg.images.map((url, j) => (
                        <img key={j} src={url} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                      ))}
                    </div>
                  )}
                  {msg.role === 'user' ? <LatexRenderer content={msg.content} className="text-sm" /> : renderContent(msg)}
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-card rounded-2xl rounded-bl-md px-5 py-3.5 border border-border/60 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-muted-foreground">{loadingPhase || _('Processing...')}</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </CardContent>

          <div className="border-t border-border/60 p-3 sm:p-4 bg-muted/20 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {([
                ['text', 'edit_note', _('Text')],
                ['image', 'image', _('Image')],
                ['camera', 'photo_camera', _('Camera')],
              ] as const).map(([mode, icon, label]) => (
                <button
                  key={mode}
                  onClick={() => setInputMode(mode)}
                  aria-pressed={inputMode === mode}
                  className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold transition-colors ${inputMode === mode ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-card text-muted-foreground border border-border/60 hover:bg-muted'}`}
                >
                  <Icon name={icon} size={18} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>

            {inputMode === 'image' && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropActive(false); }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`mb-3 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${dropActive ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/50'}`}
              >
                <div className="flex flex-col items-center justify-center gap-1.5 py-6 text-on-surface-variant">
                  <Icon name="upload_file" size={26} />
                  <p className="text-sm font-medium">{_('Drag & drop images here, or click to browse')}</p>
                  <p className="text-[11px]">{_('Multiple images supported — they combine with your text')}</p>
                </div>
              </div>
            )}

            {inputMode === 'camera' && (
              <div className="mb-3">
                <AssistantCameraCapture onUse={handleCameraCapture} onCancel={() => setInputMode('text')} isLoading={isLoading} />
              </div>
            )}

            {pendingImages.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {pendingImages.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt="" className="w-14 h-14 object-cover rounded-lg border" />
                    <button onClick={() => removePending(i)} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
              <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 rounded-full" onClick={() => fileInputRef.current?.click()} title={_('Gallery')} disabled={isLoading}>
                <Icon name="image" size={20} />
              </Button>
              <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 rounded-full" onClick={() => setInputMode('camera')} title={_('Camera')} disabled={isLoading}>
                <Icon name="photo_camera" size={20} />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={_('Type your request... (combine text with images or a photo)')}
                disabled={isLoading}
                className="h-12 min-w-0 flex-1 rounded-2xl text-base"
              />
              <Button onClick={handleSend} loading={isLoading} disabled={isLoading || (!input.trim() && pendingFiles.length === 0)} className="h-12 w-12 shrink-0 rounded-full">
                <Icon name="send" size={20} />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
