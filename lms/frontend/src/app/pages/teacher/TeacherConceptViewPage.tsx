import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/ui/Icon';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { ROUTES } from '@/lib/constants';
import { getTextbook, getChaptersForTextbook, getConceptsForChapter, getConceptRelease, setConceptRelease } from '@/services/textbookService';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { ConceptDetailMindMap } from '@/components/teacher/ConceptDetailMindMap';
import { QuestionRenderer } from '@/components/teacher/QuestionRenderer';
import type { CachedVideo } from '@/types/textbook';

function YouTubePlayer({ video }: { video: CachedVideo }) {
  const embedUrl = `https://www.youtube.com/embed/${video.youtubeId}?rel=0`;
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted">
      <iframe
        src={embedUrl}
        title={video.title}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function MarkerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [drawingEnabled, setDrawingEnabled] = useState(false);

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
    if (!drawingEnabled) return;
    e.preventDefault();
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
  }, [drawingEnabled]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !drawingEnabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, drawingEnabled]);

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
        <button
          onClick={() => setDrawingEnabled((prev) => !prev)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            drawingEnabled
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <Icon name={drawingEnabled ? 'draw' : 'pan_tool'} size={14} className="mr-1" />
          {drawingEnabled ? 'Drawing On' : 'Activate Drawing'}
        </button>
        {drawingEnabled && (
          <>
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
              className="border rounded px-2 py-1 text-xs bg-background text-foreground"
            >
              <option value={2}>Thin</option>
              <option value={4}>Medium</option>
              <option value={8}>Thick</option>
            </select>
            <Button variant="outline" size="sm" onClick={clearCanvas}>
              <Icon name="delete" size={14} className="mr-1" /> Clear
            </Button>
          </>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className={`w-full h-[400px] border rounded-xl bg-white touch-none ${drawingEnabled ? 'cursor-crosshair' : 'cursor-default'}`}
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
  const { _ } = useTranslation();
  const { textbookId, chapterId, conceptId } = useParams<{
    textbookId: string;
    chapterId: string;
    conceptId: string;
  }>();
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);
  const teacherId = authUser?.id ?? '';
  const queryClient = useQueryClient();

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

  const concept = data?.concept;
  const chapter = data?.chapter;
  const textbook = data?.textbook;

  const pushConceptMutation = useMutation({
    mutationFn: async () => {
      if (!data) return;
      const currentReleased = data.release?.mindMapReleased ?? false;
      await setConceptRelease(data.textbook.classId, textbookId!, conceptId!, chapterId!, teacherId, {
        questionBankReleased: !currentReleased,
        assignmentsReleased: !currentReleased,
        mindMapReleased: !currentReleased,
      });
    },
    onSuccess: () => {
      toast.success(data?.release?.mindMapReleased ? _('Concept pulled back from students') : _('Concept pushed to students!'));
      queryClient.invalidateQueries({ queryKey: ['teacher-concept', textbookId, conceptId] });
    },
    onError: () => {
      toast.error(_('Failed to update release settings'));
    },
  });

  return (
    <>
      <SEOHead title={concept?.title || _('Teaching')} description={`${_('Teach')} ${concept?.title || ''}`} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sm:p-6 p-4 max-w-6xl mx-auto pb-32 space-y-16"
      >
        <motion.div variants={cardStackReveal} custom={0}>
          <Link
            to={textbookId ? `/teacher/textbooks/${textbookId}` : ROUTES.TEACHER_TEXTBOOKS}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Icon name="arrow_back" size={16} />
            {_('Back to textbook')}
          </Link>
        </motion.div>

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Failed to load') : null}
          onRetry={() => refetch()}
          loadingType="detail"
          emptyMessage={_('Concept not found')}
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
                    {d.concept.difficulty && (
                      <Badge variant="outline" className="text-[10px] capitalize">{d.concept.difficulty}</Badge>
                    )}
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
                <Tabs defaultValue="teach">
                  <TabsList className="w-full overflow-x-auto inline-flex">
                    <TabsTrigger value="teach" className="flex-1">
                      <Icon name="school" size={14} className="mr-1.5" />{_('Teach')}
                    </TabsTrigger>
                    <TabsTrigger value="studyMaterial" className="flex-1">
                      <Icon name="menu_book" size={14} className="mr-1.5" />{_('Study Material')}
                    </TabsTrigger>
                    <TabsTrigger value="mindmap" className="flex-1">
                      <Icon name="account_tree" size={14} className="mr-1.5" />{_('Mind Map')}
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
                          <h2 className="font-semibold text-title-sm">{_('Marker Board')}</h2>
                        </div>
                        <MarkerCanvas />
                      </CardContent>
                    </Card>

                    <Card className="border-border/60">
                      <CardContent className="p-5">
                        <h2 className="font-semibold text-title-sm mb-3 flex items-center gap-2">
                          <Icon name="assignment" size={16} className="text-primary" />
                          {_('After Lecture Actions')}
                        </h2>
                        <p className="text-label-xs text-muted-foreground mb-4">
                          {_('Auto-generate assessments from the concept\'s question bank and release instantly.')}
                        </p>
                      <Button onClick={() => {
                        if (!data) return;
                        const params = new URLSearchParams({
                          textbookId: textbookId || '',
                          chapterId: chapterId || '',
                          conceptId: conceptId || '',
                          classId: data.textbook.classId || '',
                          subjectId: data.textbook.subjectId || '',
                        });
                        navigate(`/teacher/assessments?${params.toString()}`);
                      }} disabled={(d.concept.questionBank?.length ?? 0) === 0} className="w-full sm:w-auto">
                        <Icon name="send" size={16} className="mr-1.5" />
                        {_('Publish Test')}
                      </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="mindmap" className="mt-4">
                    <ConceptDetailMindMap concept={d.concept} />
                  </TabsContent>

                  <TabsContent value="studyMaterial" className="mt-4 space-y-4">
                    {d.concept.learningObjectives?.length > 0 && (
                      <Card className="border-border/60">
                        <CardContent className="p-5">
                          <h2 className="font-semibold mb-3 flex items-center gap-2">
                            <Icon name="track_changes" size={18} className="text-tertiary" />
                            {_('Learning Objectives')}
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

                    {d.concept.summary && (
                      <Card className="border-border/60">
                        <CardContent className="p-5">
                          <h2 className="font-semibold mb-3 flex items-center gap-2">
                            <Icon name="notes" size={18} className="text-primary" />
                            {_('Summary')}
                          </h2>
                          <div className="text-body-md leading-relaxed whitespace-pre-wrap text-muted-foreground">
                            {d.concept.summary}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Card className="border-border/60">
                      <CardContent className="p-5">
                        <h2 className="font-semibold mb-3 flex items-center gap-2">
                          <Icon name="menu_book" size={18} className="text-primary" />
                            {_('Study Notes')}
                          </h2>
                        <div className="text-body-md leading-relaxed whitespace-pre-wrap text-muted-foreground">
                          {d.concept.notes}
                        </div>
                      </CardContent>
                    </Card>

                    {d.concept.keyPoints && (
                      <Card className="border-border/60">
                        <CardContent className="p-5">
                          <h2 className="font-semibold mb-3 flex items-center gap-2">
                            <Icon name="lightbulb" size={18} className="text-primary" />
                            {_('Key Points')}
                          </h2>
                          <div className="text-body-md leading-relaxed whitespace-pre-wrap text-muted-foreground">
                            {d.concept.keyPoints}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {d.concept.formulas && (
                      <Card className="border-border/60">
                        <CardContent className="p-5">
                          <h2 className="font-semibold mb-3 flex items-center gap-2">
                            <Icon name="calculate" size={18} className="text-primary" />
                            {_('Formulas')}
                          </h2>
                          <div className="text-body-md leading-relaxed whitespace-pre-wrap text-muted-foreground font-mono">
                            {d.concept.formulas}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {d.concept.examples && (
                      <Card className="border-border/60">
                        <CardContent className="p-5">
                          <h2 className="font-semibold mb-3 flex items-center gap-2">
                            <Icon name="description" size={18} className="text-primary" />
                            {_('Examples')}
                          </h2>
                          <div className="text-body-md leading-relaxed whitespace-pre-wrap text-muted-foreground">
                            {d.concept.examples}
                          </div>
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
    </>
  );
}
