import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/ui/Icon';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { ROUTES } from '@/lib/constants';
import { getTextbook, getChaptersForTextbook, getConceptsForChapter, getConceptRelease, setConceptRelease } from '@/services/textbookService';
import { useAuthStore } from '@/store/authStore';
import type { CachedVideo } from '@/types/textbook';

function YouTubePlayer({ video }: { video: CachedVideo }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const first = document.getElementsByTagName('script')[0];
    first.parentNode?.insertBefore(tag, first);

    let checkInterval: ReturnType<typeof setInterval>;

    const initPlayer = () => {
      if (!containerRef.current || playerRef.current) return;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId: video.youtubeId,
        playerVars: { rel: 0 },
        events: { onReady: () => setLoaded(true) },
      });
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

  return (
    <div className="aspect-video rounded-xl overflow-hidden bg-muted" ref={containerRef}>
      {!loaded && (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
          Loading player...
        </div>
      )}
    </div>
  );
}

export default function TeacherConceptViewPage() {
  const { textbookId, chapterId, conceptId } = useParams<{
    textbookId: string;
    chapterId: string;
    conceptId: string;
  }>();
  const authUser = useAuthStore((s) => s.user);
  const teacherId = authUser?.id ?? '';
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['teacher-concept', textbookId, conceptId],
    queryFn: async () => {
      if (!textbookId || !conceptId) throw new Error('Missing params');
      const [fb, chapters] = await Promise.all([
        getTextbook(textbookId),
        getChaptersForTextbook(textbookId),
      ]);
      if (!fb) throw new Error('Textbook not found');
      for (const ch of chapters) {
        const concepts = await getConceptsForChapter(textbookId, ch.id);
        const c = concepts.find((co) => co.id === conceptId);
        if (c) {
          const release = await getConceptRelease(textbookId, conceptId);
          return { concept: c, chapter: ch, textbook: fb, release };
        }
      }
      throw new Error('Concept not found');
    },
    enabled: !!textbookId && !!conceptId,
  });

  const releaseMutation = useMutation({
    mutationFn: async (updates: { questionBankReleased?: boolean; assignmentsReleased?: boolean }) => {
      await setConceptRelease(textbookId!, conceptId!, chapterId!, teacherId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-concept', textbookId, conceptId] });
    },
  });

  const concept = data?.concept;
  const release = data?.release;
  const questionBankReleased = release?.questionBankReleased ?? false;
  const assignmentsReleased = release?.assignmentsReleased ?? false;

  return (
    <>
      <SEOHead title={concept?.title || 'Concept'} description={`Manage ${concept?.title || 'concept'} content`} />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-4xl mx-auto space-y-6 pb-20">
        <Link
          to={ROUTES.TEACHER_TEXTBOOKS}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <Icon name="arrow_back" size={16} />
          Back to textbooks
        </Link>

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Failed to load concept') : null}
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
                    {d.concept.videos.length} video{d.concept.videos.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    <Icon name="quiz" size={12} className="mr-1" />
                    {d.concept.questionBank.length} question{d.concept.questionBank.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    <Icon name="assignment" size={12} className="mr-1" />
                    {d.concept.assignments.length} assignment{d.concept.assignments.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>

              <Card>
                <CardContent className="p-4">
                  <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                    <Icon name="publish" size={16} className="text-primary" />
                    Content Release to Students
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name="quiz" size={16} className="text-muted-foreground" />
                        <span className="text-sm">Practice Questions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {questionBankReleased && (
                          <Badge variant="outline" className="text-[10px] text-green-600 dark:text-green-400 border-green-300 dark:border-green-700">
                            <Icon name="check_circle" size={10} className="mr-0.5" />Released
                          </Badge>
                        )}
                        <Switch
                          checked={questionBankReleased}
                          onCheckedChange={(checked) => releaseMutation.mutate({ questionBankReleased: checked })}
                          disabled={d.concept.questionBank.length === 0}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon name="assignment" size={16} className="text-muted-foreground" />
                        <span className="text-sm">Assignments</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {assignmentsReleased && (
                          <Badge variant="outline" className="text-[10px] text-green-600 dark:text-green-400 border-green-300 dark:border-green-700">
                            <Icon name="check_circle" size={10} className="mr-0.5" />Released
                          </Badge>
                        )}
                        <Switch
                          checked={assignmentsReleased}
                          onCheckedChange={(checked) => releaseMutation.mutate({ assignmentsReleased: checked })}
                          disabled={d.concept.assignments.length === 0}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Students see only released content. Use the videos below to explain concepts in class, then release materials when ready.
                  </p>
                </CardContent>
              </Card>

              <Tabs defaultValue="learn">
                <TabsList className="w-full">
                  <TabsTrigger value="learn" className="flex-1">
                    <Icon name="menu_book" size={14} className="mr-1.5" />Study Notes
                  </TabsTrigger>
                  <TabsTrigger value="videos" className="flex-1">
                    <Icon name="smart_display" size={14} className="mr-1.5" />Videos
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1">{d.concept.videos.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="questions" className="flex-1">
                    <Icon name="quiz" size={14} className="mr-1.5" />Questions
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1">{d.concept.questionBank.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="assignments" className="flex-1">
                    <Icon name="assignment" size={14} className="mr-1.5" />Assignments
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1">{d.concept.assignments.length}</Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="learn" className="mt-4 space-y-4">
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

                  {d.concept.learningObjectives.length > 0 && (
                    <Card>
                      <CardContent className="p-5">
                        <h2 className="font-semibold mb-3 flex items-center gap-2">
                          <Icon name="track_changes" size={18} className="text-tertiary" />
                          Learning Objectives
                        </h2>
                        <ul className="space-y-1.5">
                          {d.concept.learningObjectives.map((obj, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="text-tertiary mt-0.5">•</span>
                              {obj}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {d.concept.keywords.length > 0 && (
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

                <TabsContent value="videos" className="mt-4 space-y-4">
                  {d.concept.videos.length > 0 ? (
                    d.concept.videos.map((video) => (
                      <Card key={video.id}>
                        <CardContent className="p-4">
                          <YouTubePlayer video={video} />
                          <div className="mt-3">
                            <h3 className="font-medium text-sm">{video.title}</h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{video.channelName}</span>
                              <span>•</span>
                              <span>{video.duration}</span>
                            </div>
                            {video.description && (
                              <p className="text-xs text-muted-foreground mt-2">{video.description}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Icon name="smart_display" size={48} className="text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">No videos for this concept.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="questions" className="mt-4 space-y-4">
                  {d.concept.questionBank.length > 0 ? (
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
                        <p className="text-muted-foreground">No questions generated for this concept.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="assignments" className="mt-4 space-y-4">
                  {d.concept.assignments.length > 0 ? (
                    d.concept.assignments.map((a) => (
                      <Card key={a.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-medium text-sm">{a.title}</h3>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span>{a.marks} marks</span>
                                <span>•</span>
                                <span>~{a.estimatedMinutes} min</span>
                                <Badge variant="outline" className="text-[10px] capitalize">{a.type}</Badge>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">{a.instructions}</p>
                          <details className="mt-2">
                            <summary className="text-xs text-primary cursor-pointer">Answer Key & Rubric</summary>
                            {a.answerKey && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-muted-foreground">Answer Key</p>
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{a.answerKey}</p>
                              </div>
                            )}
                            {a.rubric && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-muted-foreground">Rubric</p>
                                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{a.rubric}</p>
                              </div>
                            )}
                          </details>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Icon name="assignment" size={48} className="text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">No assignments for this concept.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}