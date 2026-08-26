import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtimeInvalidation } from '@/lib/useRealtimeInvalidation';
import { toast } from 'sonner';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { getTextbook, getChaptersForTextbook, getConceptsForChapter, reprocessTextbook, deleteTextbook, updateTextbook } from '@/services/textbookService';
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
  const queryClient = useQueryClient();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const updateTitleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      if (!textbookId) return;
      await updateTextbook(textbookId, { title: newTitle });
    },
    onSuccess: () => {
      toast.success(_('Textbook title updated'));
      setIsEditingTitle(false);
      queryClient.invalidateQueries({ queryKey: ['teacher-textbook', textbookId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-subject-detail'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || _('Failed to update title.'));
    },
  });

  const handleSaveTitle = () => {
    const trimmed = editedTitle.trim();
    if (!trimmed) {
      toast.error(_('Title cannot be empty'));
      return;
    }
    updateTitleMutation.mutate(trimmed);
  };

  const textbookQuery = useQuery({
    queryKey: ['teacher-textbook', textbookId],
    queryFn: async () => {
      if (!textbookId) throw new Error('No textbook ID');
      const tb = await getTextbook(textbookId);
      if (!tb) throw new Error('Textbook not found');
      return tb;
    },
    enabled: !!textbookId,
    // Poll while processing so progress updates continuously and the textbook
    // auto-renders the moment processing completes, even if Supabase Realtime
    // is unavailable.
    refetchInterval: (query) => {
      const tb = query.state.data as any;
      return tb && (tb.status === 'processing' || tb.status === 'queued') ? 3000 : false;
    },
  });

  useRealtimeInvalidation([{ table: 'textbooks', queryKey: ['teacher-textbook', textbookId ?? ''] }]);

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
      <div className="sm:p-6 p-4 max-w-6xl mx-auto space-y-16 pb-32">
        <DataFetchWrapper data={textbookQuery.data} isLoading={textbookQuery.isLoading} error={textbookQuery.error} loadingType="detail">
          {(tb) => (
            <>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/teacher/textbooks">
                        <Icon name="arrow_back" size={16} />
                      </Link>
                    </Button>
                    <div>
                      {isEditingTitle ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveTitle();
                              else if (e.key === 'Escape') setIsEditingTitle(false);
                            }}
                            className="text-headline-sm bg-background border border-border rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary font-semibold max-w-xs sm:max-w-md"
                            autoFocus
                          />
                          <Button size="icon-sm" variant="ghost" onClick={handleSaveTitle} disabled={updateTitleMutation.isPending}>
                            <Icon name="check" className="text-green-600" size={16} />
                          </Button>
                          <Button size="icon-sm" variant="ghost" onClick={() => setIsEditingTitle(false)} disabled={updateTitleMutation.isPending}>
                            <Icon name="close" className="text-red-600" size={16} />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h1 className="text-headline-sm">{tb.title}</h1>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => {
                              setEditedTitle(tb.title);
                              setIsEditingTitle(true);
                            }}
                          >
                            <Icon name="edit" className="text-muted-foreground hover:text-foreground" size={16} />
                          </Button>
                        </div>
                      )}
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
              </div>

              <div>
                {tb.status === 'processing' || tb.status === 'queued' || tb.status === 'failed' ? (
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
                          <div className="space-y-3 mt-4">
                            {chapters.map((ch) => (
                              <div key={ch.id}>
                                <Card className="border-border/60">
                                  <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <h3 className="font-semibold">
                                          {ch.order}. {ch.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1">{ch.description}</p>
                                      </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {ch.conceptsList.map((cp) => (
                                        <Link
                                          key={cp.id}
                                          to={`/teacher/textbooks/${textbookId}/chapters/${ch.id}/concepts/${cp.id}`}
                                          className="block group"
                                        >
                                          <div className="border border-border/60 rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all bg-surface h-full">
                                            <h4 className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-2 mb-2">{cp.title}</h4>
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                              {cp.difficulty && (
                                                <Badge variant="outline" className="text-[10px] capitalize">{cp.difficulty}</Badge>
                                              )}
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{cp.summary}</p>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                              <span className="flex items-center gap-1"><Icon name="smart_display" size={12} />{cp.videos?.length || 0}</span>
                                              <span className="flex items-center gap-1"><Icon name="quiz" size={12} />{cp.questionBank?.length || 0}</span>
                                              {cp.estimatedMinutes ? <span className="flex items-center gap-1"><Icon name="schedule" size={12} />{cp.estimatedMinutes}m</span> : null}
                                            </div>
                                          </div>
                                        </Link>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="mindmap">
                          <div className="mt-4">
                            <ConceptMindMap concepts={allConcepts} chapterTitle={`${tb.title} — All Concepts`} chapters={chapters} />
                          </div>
                        </TabsContent>
                      </Tabs>
                    )}
                  </DataFetchWrapper>
                )}
              </div>
            </>
          )}
        </DataFetchWrapper>
      </div>
    </>
  );
}
