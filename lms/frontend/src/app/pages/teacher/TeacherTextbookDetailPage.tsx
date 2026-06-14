import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/ui/Icon';
import { ConceptMindMap } from '@/components/teacher/ConceptMindMap';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { getTextbook, getChaptersForTextbook, getConceptsForChapter, reprocessTextbook } from '@/services/textbookService';
import { getSubject } from '@/services/dataService';
import type { Chapter, Concept } from '@/types/textbook';

interface ChapterWithConcepts extends Chapter {
  conceptsList: Concept[];
}

function useProcessingJob(textbookId: string | undefined) {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!textbookId) {
      setLoading(false);
      return;
    }
    const docRef = doc(db, 'processingJobs', textbookId);
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          setJob(snap.data());
        } else {
          setJob(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error watching processing job:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [textbookId]);

  return { job, loading };
}

export default function TeacherTextbookDetailPage() {
  const { textbookId } = useParams<{ textbookId: string }>();
  const queryClient = useQueryClient();

  const textbookQuery = useQuery({
    queryKey: ['teacher-textbook', textbookId],
    queryFn: async () => {
      if (!textbookId) throw new Error('No textbook ID');
      const tb = await getTextbook(textbookId);
      if (!tb) throw new Error('Textbook not found');
      return tb;
    },
    enabled: !!textbookId,
  });

  const subjectQuery = useQuery({
    queryKey: ['subject', textbookQuery.data?.subjectId],
    queryFn: async () => {
      if (!textbookQuery.data?.subjectId) return null;
      return getSubject(textbookQuery.data.subjectId);
    },
    enabled: !!textbookQuery.data?.subjectId,
  });

  const chaptersQuery = useQuery({
    queryKey: ['textbook-chapters', textbookId],
    queryFn: async () => {
      if (!textbookId) return [];
      const chapters = await getChaptersForTextbook(textbookId);
      const withConcepts: ChapterWithConcepts[] = [];
      for (const ch of chapters) {
        const concepts = await getConceptsForChapter(textbookId, ch.id);
        withConcepts.push({ ...ch, conceptsList: concepts });
      }
      return withConcepts;
    },
    enabled: !!textbookId && textbookQuery.data?.status === 'ready',
  });

  const { job, loading: jobLoading } = useProcessingJob(textbookId);

  const reprocessMutation = useMutation({
    mutationFn: async () => {
      if (!textbookId) return;
      await reprocessTextbook(textbookId);
    },
    onSuccess: () => {
      toast.success('Reprocessing triggered! AI pipeline is starting...');
      textbookQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to trigger reprocessing.');
    },
  });

  const allConcepts = (chaptersQuery.data ?? []).flatMap((ch) => ch.conceptsList);

  // Helper to determine step status
  const getStepStatus = (
    stepIndex: number,
    progress: number,
    currentStep: string,
    jobStatus: string
  ): 'completed' | 'in_progress' | 'pending' | 'failed' => {
    if (jobStatus === 'FAILED') {
      const activeStepMap: Record<string, number> = {
        extract_text: 1,
        chapters: 2,
        concepts: 3,
      };
      const activeStep = activeStepMap[currentStep] || 0;
      if (stepIndex === activeStep) return 'failed';
      if (stepIndex < activeStep) return 'completed';
      return 'pending';
    }

    if (stepIndex === 0) return 'completed'; // Upload is always completed at this point

    if (stepIndex === 1) {
      if (progress >= 25 || currentStep !== 'extract_text') return 'completed';
      if (currentStep === 'extract_text') return 'in_progress';
      return 'pending';
    }

    if (stepIndex === 2) {
      if (progress >= 45 || currentStep === 'concepts' || currentStep === 'done') return 'completed';
      if (currentStep === 'chapters') return 'in_progress';
      return 'pending';
    }

    if (stepIndex === 3) {
      if (progress === 100 || currentStep === 'done') return 'completed';
      if (currentStep === 'concepts') return 'in_progress';
      return 'pending';
    }

    return 'pending';
  };

  const renderProgressTracker = (tb: any) => {
    const progressVal = job?.progress ?? (tb.status === 'failed' ? 0 : 5);
    const jobStatus = job?.status ?? (tb.status === 'failed' ? 'FAILED' : 'PROCESSING');
    const currentStep = job?.currentStep ?? (tb.status === 'failed' ? 'done' : 'extract_text');
    const errorLog = job?.error ?? tb.failureReason;

    const steps = [
      { title: 'Upload Textbook', desc: 'Textbook PDF successfully uploaded' },
      { title: 'Raw Text Extraction', desc: 'Parsing pages and extracting text segments' },
      { title: 'Curriculum & Chapters Structuring', desc: 'AI aligning TOC and outline' },
      { title: 'Concept Notes & Questions Compilation', desc: 'Generating detailed learning resources and quiz banks' },
    ];

    return (
      <Card className="border-border/60">
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-title-md font-bold flex items-center gap-2">
                {jobStatus === 'FAILED' ? (
                  <>
                    <Icon name="error" className="text-red-500 animate-pulse" />
                    Processing Failed
                  </>
                ) : (
                  <>
                    <Icon name="hourglass_top" className="text-primary animate-spin" />
                    AI Processing Pipeline Active
                  </>
                )}
              </h2>
              <p className="text-body-sm text-muted-foreground mt-1">
                {jobStatus === 'FAILED'
                  ? 'The extraction pipeline encountered an error. Review the logs below and click reprocess to try again.'
                  : 'Your textbook is being parsed by AI to generate chapters, concepts, study notes, videos, and questions.'}
              </p>
            </div>
            {jobStatus === 'FAILED' && (
              <Button
                onClick={() => reprocessMutation.mutate()}
                disabled={reprocessMutation.isPending}
                className="gap-1.5 self-start md:self-auto shrink-0"
              >
                {reprocessMutation.isPending ? (
                  <>
                    <Icon name="sync" className="animate-spin" size={16} />
                    Starting...
                  </>
                ) : (
                  <>
                    <Icon name="replay" size={16} />
                    Reprocess Textbook
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span>Overall Progress</span>
              <span>{progressVal}%</span>
            </div>
            <Progress value={progressVal} className="h-2" />
          </div>

          <div className="relative border-l border-border pl-6 ml-3 space-y-6">
            {steps.map((step, idx) => {
              const status = getStepStatus(idx, progressVal, currentStep, jobStatus);
              let iconNode = <Icon name="radio_button_unchecked" className="text-muted-foreground" size={18} />;
              let statusClass = 'text-muted-foreground';

              if (status === 'completed') {
                iconNode = <Icon name="check_circle" className="text-green-500" size={18} />;
                statusClass = 'text-foreground font-medium';
              } else if (status === 'in_progress') {
                iconNode = <Icon name="sync" className="text-primary animate-spin" size={18} />;
                statusClass = 'text-primary font-semibold';
              } else if (status === 'failed') {
                iconNode = <Icon name="error" className="text-red-500" size={18} />;
                statusClass = 'text-red-500 font-bold';
              }

              return (
                <div key={idx} className="relative">
                  <div className="absolute -left-[35px] top-0.5 bg-background p-0.5 rounded-full">
                    {iconNode}
                  </div>
                  <div>
                    <h4 className={`text-sm ${statusClass}`}>{step.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {jobStatus === 'FAILED' && errorLog && (
            <div className="rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-950/10 p-4 space-y-2">
              <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="terminal" size={14} />
                Error Logs
              </h4>
              <p className="text-xs font-mono text-red-600 dark:text-red-300 whitespace-pre-wrap leading-relaxed select-all">
                {errorLog}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <SEOHead title={textbookQuery.data?.title ?? 'Textbook'} description="View textbook chapters and concepts" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 max-w-6xl mx-auto space-y-16 pb-32">
        <DataFetchWrapper data={textbookQuery.data} isLoading={textbookQuery.isLoading} error={textbookQuery.error} loadingType="detail">
          {(tb) => (
            <>
              <motion.div variants={cardStackReveal} custom={0}>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/teacher/textbooks">
                      <Icon name="arrow_back" size={16} />
                    </Link>
                  </Button>
                  <div>
                    <h1 className="text-headline-sm">{tb.title}</h1>
                    <p className="text-sm text-muted-foreground">{subjectQuery.data?.name ?? 'Unknown Subject'}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={cardStackReveal} custom={0}>
                {tb.status === 'processing' || tb.status === 'failed' ? (
                  renderProgressTracker(tb)
                ) : (
                  <DataFetchWrapper data={chaptersQuery.data} isLoading={chaptersQuery.isLoading} error={chaptersQuery.error} loadingType="list">
                    {(chapters) => (
                      <Tabs defaultValue="chapters">
                        <TabsList>
                          <TabsTrigger value="chapters">
                            <Icon name="list" size={14} className="mr-1" />
                            Chapters
                          </TabsTrigger>
                          <TabsTrigger value="mindmap">
                            <Icon name="account_tree" size={14} className="mr-1" />
                            Mind Map
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="chapters">
                          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3 mt-4">
                            {chapters.map((ch) => (
                              <motion.div key={ch.id} variants={scrollReveal}>
                                <Card className="border-border/60">
                                  <CardContent className="p-5">
                                    <h3 className="font-semibold">
                                      {ch.order + 1}. {ch.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">{ch.description}</p>
                                    <div className="mt-3 space-y-2">
                                      {ch.conceptsList.map((cp) => (
                                        <Link
                                          key={cp.id}
                                          to={`/teacher/textbooks/${textbookId}/chapters/${ch.id}/concepts/${cp.id}`}
                                          className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                                          <span className="text-sm font-medium">{cp.title}</span>
                                        </Link>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            ))}
                          </motion.div>
                        </TabsContent>

                        <TabsContent value="mindmap">
                          <div className="mt-4">
                            <ConceptMindMap concepts={allConcepts} chapterTitle={`${tb.title} — All Concepts`} />
                          </div>
                        </TabsContent>
                      </Tabs>
                    )}
                  </DataFetchWrapper>
                )}
              </motion.div>
            </>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
