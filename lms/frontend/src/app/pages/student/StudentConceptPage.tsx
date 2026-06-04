import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/ui/Icon';
import { pageTransition } from '@/lib/motion';
import { ROUTES } from '@/lib/constants';
import { getTextbook } from '@/services/textbookService';
import { mockTextbooks } from '@/lib/mockData';

function YouTubeEmbed({ videoId, title }: { videoId: string; title: string }) {
  return (
    <div className="aspect-video rounded-xl overflow-hidden bg-muted">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

export default function StudentConceptPage() {
  const { conceptId } = useParams<{ conceptId: string }>();
  const [searchParams] = useSearchParams();
  const textbookId = searchParams.get('textbookId') || '';
  const [showAnswers, setShowAnswers] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-concept', textbookId, conceptId],
    queryFn: async () => {
      const fb = await getTextbook(textbookId);
      if (fb) {
        for (const ch of fb.chapters) {
          const c = ch.concepts.find((co) => co.id === conceptId);
          if (c) return { concept: c, chapter: ch, textbook: fb };
        }
      }

      const mock = mockTextbooks.find((t) => t.id === textbookId);
      if (mock) {
        for (const ch of mock.chapters) {
          const cId = `concept_${textbookId}_ch${mock.chapters.indexOf(ch)}_co0`;
          if (cId === conceptId) {
            return {
              concept: {
                id: conceptId,
                chapterId: ch.id,
                textbookId,
                title: ch.title,
                summary: `Study of ${ch.title}`,
                notes: `Detailed notes for ${ch.title}.`,
                learningObjectives: [`Understand ${ch.title}`],
                keywords: [],
                difficulty: 'intermediate' as const,
                prerequisites: [],
                estimatedMinutes: 15,
                videos: [],
                questionBank: [],
                assignments: [],
                order: 0,
              },
              chapter: ch,
              textbook: mock,
            };
          }
        }
      }

      throw new Error('Concept not found');
    },
    enabled: !!textbookId && !!conceptId,
  });

  return (
    <>
      <SEOHead title={data?.concept.title || 'Concept'} description={data?.concept.summary || 'Concept details'} />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-4xl mx-auto space-y-6 pb-20">
        <Link to={ROUTES.STUDENT_CHAPTER(textbookId, data?.chapter.id || '')} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Icon name="arrow_back" size={16} />
          Back to chapter
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
              </div>

              <Tabs defaultValue="learn">
                <TabsList className="w-full">
                  <TabsTrigger value="learn" className="flex-1">Learn</TabsTrigger>
                  <TabsTrigger value="videos" className="flex-1">Videos</TabsTrigger>
                  <TabsTrigger value="practice" className="flex-1">Practice</TabsTrigger>
                  <TabsTrigger value="quiz" className="flex-1">Quiz</TabsTrigger>
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

                  <div className="flex gap-3">
                    {d.concept.videos.length > 0 && (
                      <Button variant="outline" className="flex-1" onClick={() => {
                        const tab = document.querySelector('[data-value="videos"]') as HTMLElement;
                        tab?.click();
                      }}>
                        <Icon name="smart_display" size={16} className="mr-2" />
                        Watch Videos ({d.concept.videos.length})
                      </Button>
                    )}
                    {d.concept.questionBank.length > 0 && (
                      <Button variant="outline" className="flex-1" onClick={() => {
                        const tab = document.querySelector('[data-value="practice"]') as HTMLElement;
                        tab?.click();
                      }}>
                        <Icon name="quiz" size={16} className="mr-2" />
                        Practice ({d.concept.questionBank.length})
                      </Button>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="videos" className="mt-4 space-y-4">
                  {d.concept.videos.length > 0 ? (
                    d.concept.videos.map((video) => (
                      <Card key={video.id}>
                        <CardContent className="p-4">
                          <YouTubeEmbed videoId={video.youtubeId} title={video.title} />
                          <div className="mt-3">
                            <h3 className="font-medium text-sm">{video.title}</h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{video.channelName}</span>
                              <span>•</span>
                              <span>{video.duration}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Icon name="smart_display" size={48} className="text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">No videos found for this concept.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="practice" className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{d.concept.questionBank.length} questions available</p>
                    <Button variant="ghost" size="sm" onClick={() => setShowAnswers(!showAnswers)}>
                      <Icon name={showAnswers ? "visibility_off" : "visibility"} size={15} className="mr-1" />
                      {showAnswers ? 'Hide Answers' : 'Show Answers'}
                    </Button>
                  </div>

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
                                <Badge variant="outline" className="text-[10px]">{q.type.replace('_', ' ')}</Badge>
                              </div>
                              <p className="text-sm">{q.text}</p>
                              {q.options && q.options.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {q.options.map((opt, oi) => (
                                    <label key={oi} className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                                      <input type="radio" name={`q_${q.id}`} className="text-primary" />
                                      <span>{String.fromCharCode(65 + oi)}. {opt}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                              {showAnswers && (
                                <div className="mt-2 p-3 rounded-lg bg-success/10 border border-success/20">
                                  <p className="text-xs font-medium text-success">Answer: {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : q.correctAnswer}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{q.explanation}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Icon name="quiz" size={48} className="text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">No questions generated yet.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="quiz" className="mt-4">
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Icon name="assignment" size={48} className="text-primary/50 mx-auto mb-3" />
                      <h2 className="text-title-md font-semibold mb-2">Adaptive Quiz</h2>
                      <p className="text-sm text-muted-foreground mb-4">
                        Take an adaptive quiz that adjusts to your skill level. Questions are selected from {d.concept.questionBank.length} available questions.
                      </p>
                      <Button asChild size="lg">
                        <Link to={`${ROUTES.STUDENT_CONCEPT_QUIZ(conceptId!)}?textbookId=${textbookId}`}>
                          <Icon name="play_arrow" size={18} className="mr-2" />
                          Start Adaptive Quiz
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
