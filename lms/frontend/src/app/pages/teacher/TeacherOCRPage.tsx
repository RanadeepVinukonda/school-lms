import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sendChatMessage, pushQuiz, pushAssignment } from '@/services/ocrService';
import { getAllClasses } from '@/services/dataService';
import api from '@/services/api';
import LatexRenderer from '@/components/common/LatexRenderer';
import { useAuthStore } from '@/store/authStore';
import { useChatStore, ChatMsg } from '@/store/chatStore';


function QuizView({ data, onPush }: { data: any; onPush: (d: any, cls: string) => Promise<void> }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [pushing, setPushing] = useState(false);
  const { data: classes } = useQuery({ queryKey: ['admin-classes'], queryFn: getAllClasses });
  const questions = data?.questions || [];
  return (
    <div className="space-y-3 mt-2">
      <p className="text-sm font-semibold text-primary">Generated Quiz ({questions.length} questions)</p>
      {questions.map((q: any, i: number) => (
        <div key={q.id || i} className="p-3 rounded-lg border border-border/60 text-sm">
          <p className="font-medium">{i + 1}. {q.question}</p>
          {q.options ? (
            <div className="mt-1 space-y-1">
              {q.options.map((o: string, j: number) => (
                <div key={j} className={`px-2 py-1 rounded text-xs ${o === q.correctAnswer ? 'bg-success/10 text-success font-semibold' : 'text-muted-foreground'}`}>
                  {o} {o === q.correctAnswer && '✓'}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-1 text-xs text-success font-semibold">
              Answer: {q.correctAnswer}
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center gap-2 mt-3">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Select class..." /></SelectTrigger>
          <SelectContent>
            {classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => { setPushing(true); onPush(data, selectedClass).finally(() => setPushing(false)); }} disabled={!selectedClass || pushing} loading={pushing}>
          <Icon name="send" size={14} className="mr-1" /> {pushing ? 'Pushing...' : 'Push to Quizzes'}
        </Button>
      </div>
    </div>
  );
}

function AssignmentView({ data, onPush }: { data: any; onPush: (d: any, cls: string) => Promise<void> }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [pushing, setPushing] = useState(false);
  const { data: classes } = useQuery({ queryKey: ['admin-classes'], queryFn: getAllClasses });
  return (
    <div className="space-y-3 mt-2">
      <p className="text-sm font-semibold text-primary">{data.title || 'Generated Assignment'}</p>
      {data.instructions && <p className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">{data.instructions}</p>}
      <ol className="list-decimal list-inside space-y-1">
        {(data.questions || []).slice(0, 5).map((q: string, i: number) => (
          <li key={i} className="text-sm">{q}</li>
        ))}
      </ol>
      <p className="text-xs font-medium">Total Points: {data.totalPoints || 0}</p>
      <div className="flex items-center gap-2 mt-3">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Select class..." /></SelectTrigger>
          <SelectContent>
            {classes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => { setPushing(true); onPush(data, selectedClass).finally(() => setPushing(false)); }} disabled={!selectedClass || pushing} loading={pushing}>
          <Icon name="send" size={14} className="mr-1" /> {pushing ? 'Pushing...' : 'Push to Assignments'}
        </Button>
      </div>
    </div>
  );
}

function MindMapView({ data, onView }: { data: any; onView: (d: any) => void }) {
  return (
    <div className="space-y-3 mt-2">
      <p className="text-sm font-semibold text-primary">Mind Map: {data?.centralTopic || data?.topic || 'Generated'}</p>
      <div className="p-3 bg-muted/20 rounded-lg">
        <p className="text-xs font-medium mb-2">Nodes:</p>
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
        <Icon name="account_tree" size={14} className="mr-1" /> View in Mind Maps
      </Button>
    </div>
  );
}

export default function TeacherOCRPage() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id || 'anonymous';
  
  const messages = useChatStore((s) => s.teacherOcrMessages[userId] || []);
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
      setTeacherOcrMessages(userId, [{ role: 'assistant', content: 'Hello! I\'m your AI teaching assistant. Upload textbook images and tell me what you\'d like to create — a quiz, assignment, mind map, or just ask a question!' }]);
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

    const userMsg: ChatMsg = { role: 'user', content: text || 'Please process these images', images: pendingImages.length > 0 ? [...pendingImages] : undefined };
    const files = [...pendingFiles];
    setPendingImages([]);
    setPendingFiles([]);

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setLoadingPhase(files.length > 0 ? 'OCR scanning...' : 'Generating...');

    const timer = setTimeout(() => setLoadingPhase((p) => p === 'OCR scanning...' ? 'OCR still working...' : 'AI generating...'), 5000);
    const timer2 = setTimeout(() => setLoadingPhase('Almost done...'), 15000);

    try {
      const result = await sendChatMessage(
        [...messages.slice(1).map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: text || 'Please process these images' }],
        files,
      );
      const data = result.data || result;
      const reply = data.content || data.data?.message || data.data?.text || data.data?.response || data.data?.content || (typeof data === 'string' ? data : null) || 'Done!';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, data }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: err?.message || 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      clearTimeout(timer);
      clearTimeout(timer2);
      setIsLoading(false);
      setLoadingPhase('');
    }
  }, [input, pendingFiles, pendingImages, messages]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const urls = files.map((f) => URL.createObjectURL(f));
    setPendingImages((prev) => [...prev, ...urls]);
    setPendingFiles((prev) => [...prev, ...files]);
  }, []);

  const removePending = useCallback((i: number) => {
    URL.revokeObjectURL(pendingImages[i]);
    setPendingImages((prev) => prev.filter((_, idx) => idx !== i));
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== i));
  }, [pendingImages]);

  const handleDeleteQuiz = useCallback(async (quizId: string) => {
    try {
      await api.delete(`/quizzes-v2/${quizId}`);
      setMessages((prev) => [...prev, { role: 'assistant', content: `🗑️ Quiz deleted successfully.` }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ Failed to delete quiz: ${err?.message || 'Unknown error'}` }]);
    }
  }, []);

  const handlePushQuiz = useCallback(async (data: any, classId: string) => {
    setMessages((prev) => [...prev, { role: 'assistant', content: `⏳ Pushing quiz to class...` }]);
    try {
      const result = await pushQuiz(data, classId);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `✅ Quiz "${result.title || 'Untitled'}" pushed successfully! (${data.questions?.length || 0} questions)`,
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
      setMessages((prev) => [...prev, { role: 'assistant', content: `✅ Assignment "${result.title || 'Untitled'}" pushed successfully!` }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ Failed to push assignment: ${err?.message || 'Unknown error'}` }]);
    }
  }, []);

  const handleViewMindMap = useCallback((data: any) => {
    setMessages((prev) => [...prev, { role: 'assistant', content: `✅ Mind map ready! Navigate to the Mind Maps section to view it. (Mind map rendering coming soon)` }]);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const renderContent = (msg: ChatMsg) => {
    if (!msg.data) return <LatexRenderer content={msg.content} className="text-sm" />;
    const action = msg.data.data?.action || msg.data.action;
    const payload = msg.data.data?.data || msg.data.data || msg.data;
    if (action === 'pushed_quiz' && msg.data.pushedQuizId) {
      return (
        <div className="space-y-2">
          <LatexRenderer content={msg.content} className="text-sm" />
          <Button variant="destructive" size="sm" onClick={() => handleDeleteQuiz(msg.data.pushedQuizId)}>
            <Icon name="delete" size={14} className="mr-1" /> Delete Quiz
          </Button>
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
      <SEOHead title="AI Teaching Assistant" description="Chat with AI to create quizzes, assignments, and mind maps from textbook images" />
      <div className="max-w-4xl mx-auto px-4 py-6 h-[calc(100vh-80px)] flex flex-col">
        <div className="mb-4">
          <h1 className="text-title-lg font-bold">AI Teaching Assistant</h1>
          <p className="text-on-surface-variant text-sm">Upload textbook images and tell me what to create — quiz, assignment, mind map, or ask a question</p>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden border-border/60">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted/50 rounded-bl-md'}`}>
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
                <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-muted-foreground">{loadingPhase || 'Processing...'}</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </CardContent>

          <div className="border-t border-border/60 p-4">
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
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
              <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                <Icon name="image" size={18} />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your request or upload images first..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={handleSend} loading={isLoading} disabled={isLoading || (!input.trim() && pendingFiles.length === 0)}>
                <Icon name="send" size={18} />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
