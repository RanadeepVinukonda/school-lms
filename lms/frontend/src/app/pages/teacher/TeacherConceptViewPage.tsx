import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { ROUTES } from '@/lib/constants';
import { getTextbook, getChaptersForTextbook, getConceptsForChapter, getConceptRelease, setConceptRelease } from '@/services/textbookService';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { ConceptDetailMindMap } from '@/components/teacher/ConceptDetailMindMap';
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
        <p className="text-label-xs opacity-70">{video.title}</p>
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

  const [showPublishTestModal, setShowPublishTestModal] = useState(false);
  const [testTitle, setTestTitle] = useState('');
  const [testTimeLimit, setTestTimeLimit] = useState(15);
  const [testQuestionCount, setTestQuestionCount] = useState(5);
  const [testJumble, setTestJumble] = useState(true);
  const [testJumbleSeed, setTestJumbleSeed] = useState(0);
  const [testSelectedTypes, setTestSelectedTypes] = useState<string[]>([
    'multiple_choice',
    'true_false',
    'fill_blank',
    'matching',
    'numerical',
    'descriptive',
  ]);

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
          const release = await getConceptRelease(tb.classId, textbookId, conceptId);
          return { concept: c, chapter: ch, textbook: tb, release };
        }
      }
      throw new Error('Concept not found');
    },
    enabled: !!textbookId && !!conceptId,
  });

  // Dynamic initialization when data loads
  useEffect(() => {
    if (data?.concept) {
      setTestTitle(`${data.concept.title} Test`);
      const totalQ = data.concept.questionBank?.length ?? 0;
      setTestQuestionCount(totalQ > 5 ? 5 : totalQ);
    }
  }, [data]);

  // Dynamic Preview filter & shuffle logic
  const previewQuestions = useMemo(() => {
    if (!data?.concept?.questionBank) return [];
    
    // 1. Filter by selected modularity types
    let filtered = data.concept.questionBank.filter((q: any) => {
      const qType = q.type.toLowerCase();
      return testSelectedTypes.includes(qType);
    });

    // 2. Jumble (shuffle) if requested using testJumbleSeed
    if (testJumble) {
      const seededRandom = (s: number) => {
        const x = Math.sin(s++) * 10000;
        return x - Math.floor(x);
      };
      let seed = testJumbleSeed;
      filtered = [...filtered].sort(() => {
        const rand = seededRandom(seed);
        seed += 1;
        return rand - 0.5;
      });
    }

    // 3. Limit to configured count
    return filtered.slice(0, testQuestionCount);
  }, [data?.concept?.questionBank, testSelectedTypes, testQuestionCount, testJumble, testJumbleSeed]);

  const createCustomQuizMutation = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error('No concept data');
      const questions = previewQuestions.map((q: any) => ({
        text: q.text,
        type: q.type,
        difficulty: q.difficulty,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        points: q.points || 1,
      }));
      return api.post('/quizzes-v2', {
        title: testTitle || `${data.concept.title} Test`,
        description: `Custom test created from template for ${data.concept.title}`,
        classId: data.textbook.classId,
        subjectId: data.textbook.subjectId,
        textbookId,
        chapterId,
        conceptId,
        questions,
        timeLimitMinutes: testTimeLimit,
        maxAttempts: 1,
        shuffleQuestions: testJumble,
        showResults: true, // Instant results
        passingScore: 50,
        releasedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success('Test published to your class students!');
      setShowPublishTestModal(false);
    },
    onError: () => toast.error('Failed to publish test'),
  });

  const toggleReleaseMutation = useMutation({
    mutationFn: async (field: 'questionBankReleased' | 'assignmentsReleased' | 'mindMapReleased') => {
      if (!data) return;
      const currentVal = data.release?.[field] ?? false;
      await setConceptRelease(data.textbook.classId, textbookId!, conceptId!, chapterId!, teacherId, {
        [field]: !currentVal,
      });
    },
    onSuccess: () => {
      toast.success('Release settings updated!');
      queryClient.invalidateQueries({ queryKey: ['teacher-concept', textbookId, conceptId] });
    },
    onError: () => {
      toast.error('Failed to update release settings');
    },
  });

  const concept = data?.concept;
  const chapter = data?.chapter;
  const textbook = data?.textbook;

  return (
    <>
      <SEOHead title={concept?.title || 'Teaching'} description={`Teach ${concept?.title || ''}`} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="p-6 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <motion.div variants={cardStackReveal} custom={0}>
          <Link
            to={textbookId ? `/teacher/textbooks/${textbookId}` : ROUTES.TEACHER_TEXTBOOKS}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Icon name="arrow_back" size={16} />
            Back to textbook
          </Link>
        </motion.div>

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Failed to load') : null}
          onRetry={() => refetch()}
          loadingType="detail"
          emptyMessage="Concept not found"
        >
          {(d) => (
            <div className="space-y-16">
              <motion.div variants={cardStackReveal} custom={0}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary">{d.textbook.title}</Badge>
                    <span className="text-label-sm text-muted-foreground">Chapter {d.chapter.order + 1}</span>
                  </div>
                  <h1 className="text-headline-sm font-bold">{d.concept.title}</h1>
                  <p className="text-body-md text-muted-foreground mt-1">{d.concept.summary}</p>
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
              </motion.div>

              <motion.div variants={cardStackReveal} custom={0}>
                <Card className="border-border/60 border-primary/20 bg-primary/5">
                  <CardContent className="p-5 space-y-3">
                    <h2 className="font-semibold text-title-sm flex items-center gap-2">
                      <Icon name="rss_feed" size={16} className="text-primary" />
                      Student Release &amp; Push Settings
                    </h2>
                    <p className="text-label-xs text-muted-foreground">
                      Toggle what is visible and accessible to students in their portal.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button
                        variant={d.release?.questionBankReleased ? 'default' : 'outline'}
                        onClick={() => toggleReleaseMutation.mutate('questionBankReleased')}
                        disabled={toggleReleaseMutation.isPending}
                        className="justify-start gap-2 h-10 px-3"
                      >
                        <Icon name={d.release?.questionBankReleased ? 'visibility' : 'visibility_off'} size={16} />
                        <span className="text-label-xs truncate">Practice: {d.release?.questionBankReleased ? 'Released' : 'Locked'}</span>
                      </Button>

                      <Button
                        variant={d.release?.assignmentsReleased ? 'default' : 'outline'}
                        onClick={() => toggleReleaseMutation.mutate('assignmentsReleased')}
                        disabled={toggleReleaseMutation.isPending}
                        className="justify-start gap-2 h-10 px-3"
                      >
                        <Icon name={d.release?.assignmentsReleased ? 'visibility' : 'visibility_off'} size={16} />
                        <span className="text-label-xs truncate">Assignments: {d.release?.assignmentsReleased ? 'Released' : 'Locked'}</span>
                      </Button>

                      <Button
                        variant={d.release?.mindMapReleased ? 'default' : 'outline'}
                        onClick={() => toggleReleaseMutation.mutate('mindMapReleased')}
                        disabled={toggleReleaseMutation.isPending}
                        className="justify-start gap-2 h-10 px-3"
                      >
                        <Icon name={d.release?.mindMapReleased ? 'send' : 'send_and_archive'} size={16} />
                        <span className="text-label-xs truncate">Mind Map: {d.release?.mindMapReleased ? 'Pushed' : 'Not Pushed'}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={cardStackReveal} custom={0}>
                <Tabs defaultValue="teach">
                  <TabsList className="w-full overflow-x-auto inline-flex">
                    <TabsTrigger value="teach" className="flex-1">
                      <Icon name="school" size={14} className="mr-1.5" />Teach
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="flex-1">
                      <Icon name="menu_book" size={14} className="mr-1.5" />Notes
                    </TabsTrigger>
                    <TabsTrigger value="mindmap" className="flex-1">
                      <Icon name="account_tree" size={14} className="mr-1.5" />Mind Map
                    </TabsTrigger>
                    <TabsTrigger value="questions" className="flex-1">
                      <Icon name="quiz" size={14} className="mr-1.5" />Questions
                      <Badge variant="secondary" className="ml-1.5 text-[10px] px-1">{(d.concept.questionBank ?? []).length}</Badge>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="teach" className="mt-4 space-y-4">
                    {(d.concept.videos?.length ?? 0) > 0 && (
                      d.concept.videos.map((video) => (
                        <Card key={video.id} className="border-border/60">
                          <CardContent className="p-5">
                            <YouTubePlayer video={video} />
                            <div className="mt-2">
                              <h3 className="font-medium text-title-sm">{video.title}</h3>
                              <p className="text-label-xs text-muted-foreground">{video.channelName} &middot; {video.duration}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}

                    <Card className="border-border/60">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Icon name="draw" size={18} className="text-primary" />
                          <h2 className="font-semibold text-title-sm">Marker Board</h2>
                        </div>
                        <MarkerCanvas />
                      </CardContent>
                    </Card>

                    <Card className="border-border/60">
                      <CardContent className="p-5">
                        <h2 className="font-semibold text-title-sm mb-3 flex items-center gap-2">
                          <Icon name="assignment" size={16} className="text-primary" />
                          After Lecture Actions
                        </h2>
                        <p className="text-label-xs text-muted-foreground mb-4">
                          Auto-generate assessments from the concept's question bank and release instantly.
                        </p>
                          <Button onClick={() => setShowPublishTestModal(true)} disabled={(d.concept.questionBank?.length ?? 0) === 0} className="w-full sm:w-auto">
                            <Icon name="send" size={16} className="mr-1.5" />
                            Publish Test
                          </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="mindmap" className="mt-4">
                    <ConceptDetailMindMap concept={d.concept} />
                  </TabsContent>

                  <TabsContent value="notes" className="mt-4 space-y-4">
                    <Card className="border-border/60">
                      <CardContent className="p-5">
                        <h2 className="font-semibold mb-3 flex items-center gap-2">
                          <Icon name="menu_book" size={18} className="text-primary" />
                          Study Notes
                        </h2>
                        <div className="text-body-md leading-relaxed whitespace-pre-wrap text-muted-foreground">
                          {d.concept.notes}
                        </div>
                      </CardContent>
                    </Card>

                    {d.concept.learningObjectives?.length > 0 && (
                      <Card className="border-border/60">
                        <CardContent className="p-5">
                          <h2 className="font-semibold mb-3 flex items-center gap-2">
                            <Icon name="track_changes" size={18} className="text-tertiary" />
                            Learning Objectives
                          </h2>
                          <ul className="space-y-1.5">
                            {d.concept.learningObjectives.map((obj, i) => (
                              <li key={i} className="flex items-start gap-2 text-body-md text-muted-foreground">
                                <span className="text-tertiary mt-0.5">&bull;</span>
                                {obj}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {d.concept.keywords?.length > 0 && (
                      <Card className="border-border/60">
                        <CardContent className="p-5">
                          <h2 className="font-semibold mb-3 flex items-center gap-2">
                            <Icon name="label" size={18} className="text-primary" />
                            Keywords
                          </h2>
                          <div className="flex flex-wrap gap-1.5">
                            {d.concept.keywords.map((kw, i) => (
                              <Badge key={i} variant="secondary" className="text-label-xs">{kw}</Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="questions" className="mt-4 space-y-4">
                    {(d.concept.questionBank?.length ?? 0) > 0 ? (
                      d.concept.questionBank.map((q, i) => (
                        <Card key={q.id} className="border-border/60">
                          <CardContent className="p-5">
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
                                <p className="text-body-md">{q.text}</p>
                                {q.options && q.options.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {q.options.map((opt, oi) => (
                                      <div key={oi} className="flex items-center gap-2 text-label-xs text-muted-foreground">
                                        <span className="font-medium">{String.fromCharCode(65 + oi)}.</span>
                                        {opt}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <details className="mt-2">
                                  <summary className="text-label-xs text-primary cursor-pointer">Answer</summary>
                                  <p className="text-label-xs text-green-600 dark:text-green-400 mt-1">
                                    {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}
                                  </p>
                                  {q.explanation && (
                                    <p className="text-label-xs text-muted-foreground mt-1">{q.explanation}</p>
                                  )}
                                </details>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Card className="border-border/60">
                        <CardContent className="p-5 text-center">
                          <Icon name="quiz" size={48} className="text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-muted-foreground">No questions in this concept.</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </motion.div>
            </div>
          )}
        </DataFetchWrapper>
      </motion.div>

      {/* PUBLISH TEST MODAL */}
      <Dialog open={showPublishTestModal} onOpenChange={setShowPublishTestModal}>
        <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Icon name="assignment" size={24} />
              Test Template Creator &amp; Live Preview
            </DialogTitle>
            <DialogDescription>
              Configure test template inputs. The live preview updates in real-time.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-4">
            {/* Left Column: Settings (5 cols) */}
            <div className="md:col-span-5 space-y-4 pr-0 md:pr-4 md:border-r border-outline-variant/60">
              <div className="space-y-1">
                <Label className="font-semibold text-label-xs text-on-surface-variant">Test Title</Label>
                <Input value={testTitle} onChange={(e) => setTestTitle(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label className="font-semibold text-label-xs text-on-surface-variant">Time Limit (minutes)</Label>
                <Input type="number" min={1} value={testTimeLimit} onChange={(e) => setTestTimeLimit(Number(e.target.value))} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold text-label-xs text-on-surface-variant">Question Count</Label>
                  <Badge variant="secondary" className="font-bold text-[10px]">{testQuestionCount} / {concept?.questionBank?.length || 0}</Badge>
                </div>
                <input
                  type="range"
                  min="1"
                  max={concept?.questionBank?.length || 1}
                  value={testQuestionCount}
                  onChange={(e) => setTestQuestionCount(Number(e.target.value))}
                  className="w-full h-2 bg-secondary-container rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="flex items-center justify-between py-2 border-b border-t border-outline-variant/40">
                <div className="space-y-0.5">
                  <Label className="cursor-pointer text-label-xs font-semibold text-on-surface-variant" htmlFor="jumble-switch">Jumble Questions</Label>
                  <p className="text-label-xs text-muted-foreground">Shuffle order for students</p>
                </div>
                <input
                  type="checkbox"
                  id="jumble-switch"
                  checked={testJumble}
                  onChange={(e) => {
                    setTestJumble(e.target.checked);
                    if (e.target.checked) setTestJumbleSeed(Math.random());
                  }}
                  className="h-4 w-4 rounded border-outline-variant bg-surface text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              {testJumble && (
                <Button variant="outline" size="sm" className="w-full h-8 text-label-xs font-semibold" onClick={() => setTestJumbleSeed(Math.random())}>
                  <Icon name="shuffle" size={12} className="mr-1" /> Re-shuffle Order
                </Button>
              )}

              <div className="space-y-2">
                <Label className="text-label-xs font-bold text-muted-foreground uppercase tracking-wider">Modularities (Include types)</Label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {[
                    { value: 'multiple_choice', label: 'Multiple Choice (MCQ)' },
                    { value: 'true_false', label: 'True / False' },
                    { value: 'fill_blank', label: 'Fill in the Blank' },
                    { value: 'matching', label: 'Matching' },
                    { value: 'numerical', label: 'Numerical' },
                    { value: 'descriptive', label: 'Descriptive' },
                  ].map((type) => {
                    const checked = testSelectedTypes.includes(type.value);
                    return (
                      <label key={type.value} className="flex items-center gap-2 text-label-xs font-semibold cursor-pointer py-0.5 text-on-surface-variant">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTestSelectedTypes([...testSelectedTypes, type.value]);
                            } else {
                              setTestSelectedTypes(testSelectedTypes.filter((t) => t !== type.value));
                            }
                          }}
                          className="h-3.5 w-3.5 rounded border-outline-variant text-primary focus:ring-primary"
                        />
                        {type.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Live Preview (7 cols) */}
            <div className="md:col-span-7 flex flex-col h-[480px]">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60 shrink-0">
                <h3 className="text-label-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Icon name="visibility" size={14} /> Live Interactive Preview
                </h3>
                <span className="text-[9px] text-muted-foreground font-mono font-bold bg-muted px-1.5 py-0.5 rounded">Student Preview Mode</span>
              </div>

              <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
                {previewQuestions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground gap-2 bg-surface-variant/10 rounded-xl border border-dashed border-outline-variant">
                    <Icon name="find_in_page" size={36} className="opacity-40" />
                    <p className="text-label-xs font-bold text-on-surface-variant">No questions match current configuration</p>
                    <p className="text-[10px] opacity-75">Adjust modularity types or counts to load questions.</p>
                  </div>
                ) : (
                  previewQuestions.map((q: any, i: number) => (
                    <Card key={q.id || i} className="border border-outline-variant/20 hover:border-primary/20 hover:shadow-elevation-1 transition-all">
                      <CardContent className="p-5 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground border-b border-outline-variant/20 pb-1.5 mb-1.5">
                          <span className="flex items-center gap-1 font-bold text-on-surface-variant">
                            <span className="h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">
                              {i + 1}
                            </span>
                            Question
                          </span>
                          <div className="flex gap-1.5">
                            <Badge variant="outline" className="text-[9px] uppercase tracking-wide py-0 px-1 font-semibold">{q.type.replace(/_/g, ' ')}</Badge>
                            <Badge variant="outline" className="text-[9px] uppercase tracking-wide py-0 px-1 font-semibold">{q.points || 1} pt</Badge>
                          </div>
                        </div>

                        <p className="text-body-md font-semibold text-on-surface leading-snug">{q.text}</p>

                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {q.options.map((opt: string, oi: number) => (
                              <div key={oi} className="flex items-center gap-2 rounded-lg border border-outline-variant/40 p-2 text-label-xs bg-surface-variant/20">
                                <span className="font-bold text-muted-foreground">{String.fromCharCode(65 + oi)}.</span>
                                <span className="truncate">{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 flex items-center justify-between text-[10px]">
                          <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1 font-mono">
                            <Icon name="check" size={12} /> Key: {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}
                          </span>
                          {q.explanation && (
                            <details className="cursor-pointer text-primary">
                              <summary className="hover:underline font-bold">Show Explanation</summary>
                              <p className="text-muted-foreground mt-1 select-all font-sans leading-relaxed text-[11px] p-2 bg-muted rounded border border-outline-variant/40">
                                {q.explanation}
                              </p>
                            </details>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-outline-variant/40 pt-3">
            <Button variant="outline" onClick={() => setShowPublishTestModal(false)}>Cancel</Button>
            <Button onClick={() => createCustomQuizMutation.mutate()} disabled={previewQuestions.length === 0 || createCustomQuizMutation.isPending}>
              {createCustomQuizMutation.isPending ? (
                <><Icon name="sync" size={14} className="mr-1 animate-spin" />Publishing...</>
              ) : (
                <><Icon name="send" size={14} className="mr-1" />Publish Test to Students</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
