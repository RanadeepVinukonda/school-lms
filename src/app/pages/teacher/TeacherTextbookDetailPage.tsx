import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/ui/Icon';
import { ConceptMindMap } from '@/components/teacher/ConceptMindMap';
import { scrollReveal, staggerContainer, cardStackReveal } from '@/lib/motion';
import { getTextbook, getChaptersForTextbook, getConceptsForChapter, reprocessTextbook, deleteTextbook } from '@/services/textbookService';
import { getSubject } from '@/services/dataService';
import type { Chapter, Concept } from '@/types/textbook';

interface ChapterWithConcepts extends Chapter {
  conceptsList: Concept[];
}

export default function TeacherTextbookDetailPage() {
  const { _ } = useTranslation();
  const { textbookId } = useParams<{ textbookId: string }>();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const textbookQuery = useQuery({
    queryKey: ['teacher-textbook', textbookId],
    queryFn: async () => {
      if (!textbookId) throw new Error('No textbook ID');
      const tb = await getTextbook(textbookId);
      if (!tb) throw new Error('Textbook not found');
      return tb;
    },
    enabled: !!textbookId,
    refetchInterval: (query) => {
      const data = query.state.data as { status?: string } | undefined;
      return data?.status === 'processing' ? 3000 : false;
    },
  });

  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [textbookQuery.data?.logs]);

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

  const reprocessMutation = useMutation({
    mutationFn: async () => {
      if (!textbookId) return;
      await reprocessTextbook(textbookId);
    },
    onSuccess: () => {
      toast.success(_('Reprocessing triggered! AI pipeline is starting...'));
      textbookQuery.refetch();
    },
    onError: (err: any) => {
      toast.error(err?.message || _('Failed to trigger reprocessing.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!textbookId) return;
      await deleteTextbook(textbookId);
    },
    onSuccess: () => {
      toast.success(_('Textbook deleted'));
      navigate('/teacher/textbooks');
    },
    onError: (err: any) => {
      toast.error(err?.message || _('Failed to delete textbook.'));
      setDeleteDialogOpen(false);
    },
  });

  const allConcepts = (chaptersQuery.data ?? []).flatMap((ch) => ch.conceptsList);

  const renderProgressTracker = (tb: any) => {
    const isFailed = tb.status === 'failed';
    const isReady = tb.status === 'ready';
    const errorLog = tb.failureReason;
    const total = tb.totalConcepts || 0;
    const completed = tb.completedConcepts || 0;
    const progressVal = total > 0 ? Math.round(25 + (completed / total) * 75) : 5;
    const stage = total > 0 ? `${completed} / ${total} ${_('concepts')}` : _('Extracting text...');

    return (
      <Card className="border-border/60">
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-title-md font-bold flex items-center gap-2">
                {isFailed ? (
                  <>
                    <Icon name="error" className="text-red-500 animate-pulse" />
                    {_('Processing Failed')}
                  </>
                ) : (
                  <>
                    <Icon name="hourglass_top" className="text-primary animate-spin" />
                    {_('AI Processing Pipeline Active')}
                  </>
                )}
              </h2>
              <p className="text-body-sm text-muted-foreground mt-1">
                {isFailed
                  ? _('The extraction pipeline encountered an error.')
                  : _('Your textbook is being parsed by AI to generate chapters, concepts, study notes, videos, and questions.')}
              </p>
            </div>
            <div className="flex gap-2 self-start md:self-auto shrink-0">
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1.5">
                    <Icon name="delete" size={16} />
                    {_('Delete')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{_('Delete Textbook')}</DialogTitle>
                    <DialogDescription>
                      {_('Are you sure you want to delete')} "{tb.title}"? {_('This action cannot be undone and will remove all chapters, concepts, and uploaded files.')}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                      {_('Cancel')}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? _('Deleting...') : _('Delete Forever')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {(isFailed || isReady) && (
                <Button
                  onClick={() => reprocessMutation.mutate()}
                  disabled={reprocessMutation.isPending}
                  size="sm"
                  className="gap-1.5"
                >
                  {reprocessMutation.isPending ? (
                    <>
                      <Icon name="sync" className="animate-spin" size={16} />
                      {_('Starting...')}
                    </>
                  ) : (
                    <>
                      <Icon name="replay" size={16} />
                      {_('Reprocess')}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {!isFailed && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span>{_('Overall Progress')}</span>
                <span>{progressVal}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressVal}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{stage}</p>
            </div>
          )}

          {tb.logs && tb.logs.length > 0 && (
            <div className="rounded-xl border border-border/80 bg-slate-950 p-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Icon name="terminal" size={14} className="text-emerald-500 animate-pulse" />
                {_('Live Processing Terminal')}
              </h4>
              <div className="max-h-48 overflow-y-auto font-mono text-xs text-slate-300 space-y-1.5 pr-2">
                {tb.logs.map((log: string, idx: number) => {
                  const isWarning = log.includes('[Warning]');
                  const isSuccess = log.includes('Success!') || log.includes('parsed successfully') || log.includes('enrichment complete');
                  return (
                    <div
                      key={idx}
                      className={
                        isWarning ? 'text-amber-400' : isSuccess ? 'text-emerald-400' : 'text-slate-300'
                      }
                    >
                      {log}
                    </div>
                  );
                })}
                <div ref={logEndRef} />
              </div>
            </div>
          )}

          {isFailed && errorLog && (
            <div className="rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-950/10 p-4 space-y-2">
              <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="terminal" size={14} />
                {_('Error Logs')}
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
      <SEOHead title={textbookQuery.data?.title ?? _('Textbook')} description={_('View textbook chapters and concepts')} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sm:p-6 p-4 max-w-6xl mx-auto space-y-16 pb-32">
        <DataFetchWrapper data={textbookQuery.data} isLoading={textbookQuery.isLoading} error={textbookQuery.error} loadingType="detail">
          {(tb) => (
            <>
              <motion.div variants={cardStackReveal} custom={0}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/teacher/textbooks">
                        <Icon name="arrow_back" size={16} />
                      </Link>
                    </Button>
                    <div>
                      <h1 className="text-headline-sm">{tb.title}</h1>
                      <p className="text-sm text-muted-foreground">{subjectQuery.data?.name ?? _('Unknown Subject')}</p>
                    </div>
                  </div>
                  <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-1.5">
                        <Icon name="delete" size={16} />
                        {_('Delete')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{_('Delete Textbook')}</DialogTitle>
                        <DialogDescription>
                          {_('Are you sure you want to delete')} "{tb.title}"? {_('This action cannot be undone and will remove all chapters, concepts, and uploaded files.')}
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                          {_('Cancel')}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => deleteMutation.mutate()}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? _('Deleting...') : _('Delete Forever')}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </motion.div>

              <motion.div variants={cardStackReveal} custom={0}>
                {tb.status === 'processing' || tb.status === 'failed' ? (
                  renderProgressTracker(tb)
                ) : (
                  <DataFetchWrapper data={chaptersQuery.data} isLoading={chaptersQuery.isLoading} error={chaptersQuery.error} loadingType="list">
                    {(chapters) => (
                      <Tabs defaultValue="chapters">
                        <TabsList className="w-full overflow-x-auto inline-flex">
                          <TabsTrigger value="chapters">
                            <Icon name="list" size={14} className="mr-1" />
                            {_('Chapters')}
                          </TabsTrigger>
                          <TabsTrigger value="mindmap">
                            <Icon name="account_tree" size={14} className="mr-1" />
                            {_('Mind Map')}
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="chapters">
                          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3 mt-4">
                            {chapters.map((ch) => (
                              <motion.div key={ch.id} variants={scrollReveal}>
                                <Card className="border-border/60">
                                  <CardContent className="p-5">
                                    <h3 className="font-semibold">
                                      {ch.order}. {ch.title}
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
