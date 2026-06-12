import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/ui/Icon';
import { pageTransition } from '@/lib/motion';
import { ROUTES } from '@/lib/constants';
import { getTextbook, getChaptersForTextbook, getConceptsForChapter } from '@/services/textbookService';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import type { CachedVideo } from '@/types/textbook';

const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

function isValidYoutubeId(id: string): boolean {
  return YOUTUBE_ID_RE.test(id);
}

function YouTubePlayer({ video }: { video: CachedVideo }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!isValidYoutubeId(video.youtubeId)) {
      setState('error');
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const first = document.getElementsByTagName('script')[0];
    first.parentNode?.insertBefore(tag, first);

    let checkInterval: ReturnType<typeof setInterval>;

    const initPlayer = () => {
      if (!containerRef.current || playerRef.current) return;
      try {
        playerRef.current = new YT.Player(containerRef.current, {
          videoId: video.youtubeId,
          playerVars: { rel: 0, origin: window.location.origin },
          events: {
            onReady: () => setState('ready'),
            onError: () => setState('error'),
          },
        });
      } catch {
        setState('error');
      }
    };

    if (typeof YT !== 'undefined' && YT.Player) {
      initPlayer();
    } else {
      checkInterval = setInterval(() => {
        if (typeof YT !== 'undefined' && YT.Player) {
          clearInterval(checkInterval);
          initPlayer();
        }
      }, 200);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [video.youtubeId]);

  if (state === 'error') {
    return (
      <div className="aspect-video rounded-xl overflow-hidden bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Icon name="videocam_off" className="text-3xl" />
        <p className="text-sm">Video unavailable</p>
        <p className="text-xs opacity-70">{video.title}</p>
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-xl overflow-hidden bg-muted" ref={containerRef}>
      {state === 'loading' && (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
          Loading player...
        </div>
      )}
    </div>
  );
}

function MarkerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [color, lineWidth]);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.closePath();
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const colors = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          {colors.map((c) => (
            <button
              key={c}
              className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-primary' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <select
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
          className="border rounded px-2 py-1 text-xs bg-background"
        >
          <option value={2}>Thin</option>
          <option value={4}>Medium</option>
          <option value={8}>Thick</option>
        </select>
        <Button variant="outline" size="sm" onClick={clearCanvas}>
          <Icon name="delete" size={14} className="mr-1" /> Clear
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-[400px] border rounded-xl bg-white cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
}

export default function TeacherConceptViewPage() {
  const { textbookId, chapterId, conceptId } = useParams<{
    textbookId: string;
    chapterId: string;
    conceptId: string;
  }>();
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const teacherId = authUser?.id ?? '';
  const queryClient = useQueryClient();

  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [quizTimeLimit, setQuizTimeLimit] = useState(10);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [assignTimeLimit, setAssignTimeLimit] = useState(20);
  const [showExamDialog, setShowExamDialog] = useState(false);
  const [examTimeLimit, setExamTimeLimit] = useState(60);
  const [examTitle, setExamTitle] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['teacher-concept', textbookId, conceptId],
    queryFn: async () => {
      if (!textbookId || !conceptId) throw new Error('Missing params');
      const [tb, chapters] = await Promise.all([
        getTextbook(textbookId),
        getChaptersForTextbook(textbookId),
      ]);
      if (!tb) throw new Error('Textbook not found');
      for (const ch of chapters) {
        const concepts = await getConceptsForChapter(textbookId, ch.id);
        const c = concepts.find((co) => co.id === conceptId);
        if (c) {
          return { concept: c, chapter: ch, textbook: tb };
        }
      }
      throw new Error('Concept not found');
    },
    enabled: !!textbookId && !!conceptId,
  });

  const createQuizMutation = useMutation({
    mutationFn: async (timeLimit: number) => {
      if (!data) throw new Error('No concept data');
      const questions = data.concept.questionBank.map((q: any) => ({
        text: q.text,
        type: q.type,
        difficulty: q.difficulty,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        points: q.points || 1,
      }));
      return api.post('/quizzes-v2', {
        title: `${data.concept.title} Quiz`,
        description: `Auto-generated quiz for ${data.concept.title}`,
        classId: data.textbook.classId,
        subjectId: data.textbook.subjectId,
        textbookId,
        chapterId,
        conceptId,
        questions,
        timeLimitMinutes: timeLimit,
        maxAttempts: 1,
        shuffleQuestions: true,
        showResults: false,
        passingScore: 50,
        releasedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success('Quiz created and released to students!');
      setShowQuizDialog(false);
    },
    onError: () => toast.error('Failed to create quiz'),
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (timeLimit: number) => {
      if (!data) throw new Error('No concept data');
      const questions = data.concept.questionBank.map((q: any) => ({
        text: q.text,
        type: q.type,
        difficulty: q.difficulty,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        points: q.points || 1,
      }));
      return api.post('/assignments-v2', {
        title: `${data.concept.title} Assignment`,
        description: `Auto-generated assignment for ${data.concept.title}`,
        classId: data.textbook.classId,
        subjectId: data.textbook.subjectId,
        textbookId,
        chapterId,
        conceptId,
        questions,
        timeLimitMinutes: timeLimit,
        maxAttempts: 2,
        shuffleQuestions: false,
        showResults: false,
        passingScore: 40,
        releasedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success('Assignment created and released!');
      setShowAssignmentDialog(false);
    },
    onError: () => toast.error('Failed to create assignment'),
  });

  const createExamMutation = useMutation({
    mutationFn: async (timeLimit: number) => {
      if (!data) throw new Error('No concept data');
      const allChapters = await queryClient.fetchQuery({
        queryKey: ['textbook-chapters-all', textbookId],
        queryFn: () => getChaptersForTextbook(textbookId!),
      });
      const allConcepts = await Promise.all(
        allChapters.map((ch) => getConceptsForChapter(textbookId!, ch.id))
      );
      const allQuestions = allConcepts.flatMap((clist) =>
        clist.flatMap((c) =>
          c.questionBank.map((q: any) => ({
            text: q.text,
            type: q.type,
            difficulty: q.difficulty,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            points: q.points || 1,
            conceptId: c.id,
          }))
        )
      );
      return api.post('/exams-v2', {
        title: examTitle || `${data.chapter.title} Exam`,
        description: `End-of-chapter exam for ${data.chapter.title}`,
        classId: data.textbook.classId,
        subjectId: data.textbook.subjectId,
        textbookId,
        chapterId,
        conceptIds: [conceptId],
        questions: allQuestions.slice(0, 30),
        timeLimitMinutes: timeLimit,
        maxAttempts: 1,
        shuffleQuestions: true,
        showResults: false,
        passingScore: 40,
        releasedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success('Exam created and released!');
      setShowExamDialog(false);
    },
    onError: () => toast.error('Failed to create exam'),
  });

  const concept = data?.concept;
  const chapter = data?.chapter;
  const textbook = data?.textbook;

  return (
    <>
      <SEOHead title={concept?.title || 'Teaching'} description={`Teach ${concept?.title || ''}`} />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-6xl mx-auto space-y-6 pb-20">
        <Link
          to={textbookId ? `/teacher/textbooks/${textbookId}` : ROUTES.TEACHER_TEXTBOOKS}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <Icon name="arrow_back" size={16} />
          Back to textbook
        </Link>

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Failed to load') : null}
          onRetry={() => refetch()}
          loadingType="detail"
          emptyMessage="Concept not found"
        >
          {(d) => (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary">{d.textbook.title}</Badge>
                  <span className="text-sm text-muted-foreground">Chapter {d.chapter.order + 1}</span>
                </div>
                <h1 className="text-headline-sm font-bold">{d.concept.title}</h1>
                <p className="text-muted-foreground mt-1">{d.concept.summary}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-[10px] capitalize">{d.concept.difficulty}</Badge>
                  <Badge variant="outline" className="text-[10px]">
                    <Icon name="smart_display" size={12} className="mr-1" />
                    {(d.concept.videos ?? []).length} video{(d.concept.videos ?? []).length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    <Icon name="quiz" size={12} className="mr-1" />
                    {(d.concept.questionBank ?? []).length} question{(d.concept.questionBank ?? []).length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>

              <Tabs defaultValue="teach">
                <TabsList className="w-full">
                  <TabsTrigger value="teach" className="flex-1">
                    <Icon name="school" size={14} className="mr-1.5" />Teach
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="flex-1">
                    <Icon name="menu_book" size={14} className="mr-1.5" />Notes
                  </TabsTrigger>
                  <TabsTrigger value="questions" className="flex-1">
                    <Icon name="quiz" size={14} className="mr-1.5" />Questions
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1">{(d.concept.questionBank ?? []).length}</Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="teach" className="mt-4 space-y-4">
                  {(d.concept.videos?.length ?? 0) > 0 && (
                    d.concept.videos.map((video) => (
                      <Card key={video.id}>
                        <CardContent className="p-4">
                          <YouTubePlayer video={video} />
                          <div className="mt-2">
                            <h3 className="font-medium text-sm">{video.title}</h3>
                            <p className="text-xs text-muted-foreground">{video.channelName} &middot; {video.duration}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Icon name="draw" size={18} className="text-primary" />
                        <h2 className="font-semibold text-sm">Marker Board</h2>
                      </div>
                      <MarkerCanvas />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Icon name="assignment" size={16} className="text-primary" />
                        After Lecture Actions
                      </h2>
                      <p className="text-xs text-muted-foreground mb-4">
                        Auto-generate assessments from the concept's question bank and release instantly.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={() => setShowQuizDialog(true)} disabled={(d.concept.questionBank?.length ?? 0) === 0}>
                          <Icon name="quiz" size={16} className="mr-1.5" />
                          Pass Quiz
                        </Button>
                        <Button variant="secondary" onClick={() => setShowAssignmentDialog(true)} disabled={(d.concept.questionBank?.length ?? 0) === 0}>
                          <Icon name="assignment" size={16} className="mr-1.5" />
                          Give Assignment
                        </Button>
                        <Button variant="tonal" onClick={() => setShowExamDialog(true)} disabled={(d.concept.questionBank?.length ?? 0) === 0}>
                          <Icon name="fact_check" size={16} className="mr-1.5" />
                          Start Exam
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => navigate(`${ROUTES.TEACHER_TEST_TEMPLATES}?classId=${d.textbook.classId}&subjectId=${d.textbook.subjectId}&textbookId=${textbookId}&chapterId=${chapterId}&conceptId=${conceptId}`)}
                        >
                          <Icon name="description" size={16} className="mr-1.5" />
                          Create Test Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="notes" className="mt-4 space-y-4">
                  <Card>
                    <CardContent className="p-5">
                      <h2 className="font-semibold mb-3 flex items-center gap-2">
                        <Icon name="menu_book" size={18} className="text-primary" />
                        Study Notes
                      </h2>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                        {d.concept.notes}
                      </div>
                    </CardContent>
                  </Card>

                  {d.concept.learningObjectives?.length > 0 && (
                    <Card>
                      <CardContent className="p-5">
                        <h2 className="font-semibold mb-3 flex items-center gap-2">
                          <Icon name="track_changes" size={18} className="text-tertiary" />
                          Learning Objectives
                        </h2>
                        <ul className="space-y-1.5">
                          {d.concept.learningObjectives.map((obj, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="text-tertiary mt-0.5">&bull;</span>
                              {obj}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {d.concept.keywords?.length > 0 && (
                    <Card>
                      <CardContent className="p-5">
                        <h2 className="font-semibold mb-3 flex items-center gap-2">
                          <Icon name="label" size={18} className="text-primary" />
                          Keywords
                        </h2>
                        <div className="flex flex-wrap gap-1.5">
                          {d.concept.keywords.map((kw, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="questions" className="mt-4 space-y-4">
                  {(d.concept.questionBank?.length ?? 0) > 0 ? (
                    d.concept.questionBank.map((q, i) => (
                      <Card key={q.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-[10px] capitalize">{q.difficulty}</Badge>
                                <Badge variant="outline" className="text-[10px] capitalize">{q.type.replace(/_/g, ' ')}</Badge>
                                <Badge variant="outline" className="text-[10px] capitalize">{q.category}</Badge>
                              </div>
                              <p className="text-sm">{q.text}</p>
                              {q.options && q.options.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {q.options.map((opt, oi) => (
                                    <div key={oi} className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span className="font-medium">{String.fromCharCode(65 + oi)}.</span>
                                      {opt}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <details className="mt-2">
                                <summary className="text-xs text-primary cursor-pointer">Answer</summary>
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}
                                </p>
                                {q.explanation && (
                                  <p className="text-xs text-muted-foreground mt-1">{q.explanation}</p>
                                )}
                              </details>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Icon name="quiz" size={48} className="text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">No questions in this concept.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DataFetchWrapper>
      </motion.div>

      <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pass Quiz</DialogTitle>
            <DialogDescription>Create a timed quiz from this concept's question bank and release to students.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Time Limit (minutes)</Label>
              <Input type="number" value={quizTimeLimit} onChange={(e) => setQuizTimeLimit(Number(e.target.value))} min={1} />
            </div>
            <p className="text-xs text-muted-foreground">
              {concept?.questionBank?.length || 0} questions will be included. Students will see results after you push them.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuizDialog(false)}>Cancel</Button>
            <Button onClick={() => createQuizMutation.mutate(quizTimeLimit)} loading={createQuizMutation.isPending}>
              Create & Release Quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Give Assignment</DialogTitle>
            <DialogDescription>Create an assignment for deeper understanding and release to students.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Time Limit (minutes)</Label>
              <Input type="number" value={assignTimeLimit} onChange={(e) => setAssignTimeLimit(Number(e.target.value))} min={1} />
            </div>
            <p className="text-xs text-muted-foreground">
              Students get 2 attempts. Auto-graded from question bank answers.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>Cancel</Button>
            <Button onClick={() => createAssignmentMutation.mutate(assignTimeLimit)} loading={createAssignmentMutation.isPending}>
              Create & Release Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExamDialog} onOpenChange={setShowExamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Exam</DialogTitle>
            <DialogDescription>Create end-of-chapter exam from all concept questions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Exam Title</Label>
              <Input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} placeholder={`${chapter?.title || ''} Exam`} />
            </div>
            <div>
              <Label>Time Limit (minutes)</Label>
              <Input type="number" value={examTimeLimit} onChange={(e) => setExamTimeLimit(Number(e.target.value))} min={1} />
            </div>
            <p className="text-xs text-muted-foreground">
              Pulls questions across all concepts in this chapter. Auto-graded when submitted.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExamDialog(false)}>Cancel</Button>
            <Button onClick={() => createExamMutation.mutate(examTimeLimit)} loading={createExamMutation.isPending}>
              Create & Release Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
