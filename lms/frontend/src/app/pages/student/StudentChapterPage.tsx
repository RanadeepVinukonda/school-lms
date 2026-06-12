import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/ui/Icon';
import { ConceptMindMap } from '@/components/teacher/ConceptMindMap';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { ROUTES } from '@/lib/constants';
import { getTextbook, getChaptersForTextbook, getConceptsForChapter, getAllConceptReleases } from '@/services/textbookService';
import { getSubject } from '@/services/dataService';
import type { ConceptRelease } from '@/types/textbook';

export default function StudentChapterPage() {
  const { textbookId, chapterId } = useParams<{ textbookId: string; chapterId: string }>();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['student-chapter', textbookId, chapterId],
    queryFn: async () => {
      if (!textbookId || !chapterId) throw new Error('Missing params');
      const [fb, chapters, releases] = await Promise.all([
        getTextbook(textbookId),
        getChaptersForTextbook(textbookId),
        getAllConceptReleases(textbookId),
      ]);
      if (!fb) throw new Error('Textbook not found');
      const subject = await getSubject(fb.subjectId);
      const ch = chapters.find((c) => c.id === chapterId);
      if (!ch) throw new Error('Chapter not found');
      const concepts = await getConceptsForChapter(textbookId, chapterId);
      const releaseMap = new Map(releases.map((r) => [r.conceptId, r]));
      return { textbook: fb, subject, chapter: { ...ch, concepts }, releaseMap };
    },
    enabled: !!textbookId && !!chapterId,
  });

  function getReleaseBadge(release: ConceptRelease | undefined) {
    if (!release) {
      return <Badge variant="outline" className="text-[10px] text-muted-foreground">Pending</Badge>;
    }
    const released: string[] = [];
    if (release.questionBankReleased) released.push('Questions');
    if (release.assignmentsReleased) released.push('Assignments');
    if (released.length === 0) {
      return <Badge variant="outline" className="text-[10px] text-muted-foreground">Pending</Badge>;
    }
    return (
      <Badge variant="outline" className="text-[10px] text-green-600 dark:text-green-400 border-green-300 dark:border-green-700">
        {released.join(' + ')} released
      </Badge>
    );
  }

  return (
    <>
      <SEOHead title={data?.chapter?.title || 'Chapter'} description={data?.chapter?.description || `Study ${data?.chapter?.title || 'chapter'}`} />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-4xl mx-auto space-y-6 pb-20">
        <Link to={ROUTES.STUDENT_TEXTBOOK(textbookId!)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <Icon name="arrow_back" size={16} />
          Back to textbook
        </Link>

        <DataFetchWrapper
          data={data}
          isLoading={isLoading}
          error={isError ? error ?? new Error('Failed to load chapter') : null}
          onRetry={() => refetch()}
          loadingType="detail"
          emptyMessage="Chapter not found"
        >
          {(d) => {
            const ch = d.chapter;
            const subj = d.subject;
            const releaseMap = d.releaseMap;
            const concepts = (ch as any).concepts ?? [];
            return (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {subj && <Badge variant="secondary" style={{ backgroundColor: `${subj.color}20`, color: subj.color }}>{subj.name}</Badge>}
                    <span className="text-sm text-muted-foreground">Chapter {(ch as any).order + 1}</span>
                  </div>
                  <h1 className="text-headline-sm font-bold">{(ch as any).title}</h1>
                  {(ch as any).description && <p className="text-muted-foreground mt-1">{(ch as any).description}</p>}
                </div>

                {concepts.length > 0 && (
                  <Tabs defaultValue="list">
                    <TabsList>
                      <TabsTrigger value="list"><Icon name="list" size={14} className="mr-1" />List</TabsTrigger>
                      <TabsTrigger value="mindmap"><Icon name="account_tree" size={14} className="mr-1" />Mind Map</TabsTrigger>
                    </TabsList>

                    <TabsContent value="list">
                      <h2 className="text-title-md font-semibold mb-3 mt-4">Concepts ({concepts.length})</h2>
                      <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-3">
                        {concepts.map((concept: any, i: number) => (
                          <motion.div key={concept.id} variants={listItem}>
                            <Link to={`${ROUTES.STUDENT_CONCEPT(concept.id)}?textbookId=${textbookId}`}>
                              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <span className="text-sm font-bold text-primary">{i + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-medium">{concept.title}</h3>
                                      <p className="text-sm text-muted-foreground line-clamp-1">{concept.summary}</p>
                                      <div className="flex items-center gap-3 mt-2">
                                        <Badge variant="outline" className="text-[10px] capitalize">
                                          {concept.difficulty}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                          <Icon name="schedule" size={12} className="inline mr-0.5" />
                                          {concept.estimatedMinutes} min
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          <Icon name="quiz" size={12} className="inline mr-0.5" />
                                          {concept.questionBank?.length || 0} questions
                                        </span>
                                        {getReleaseBadge(releaseMap.get(concept.id))}
                                      </div>
                                    </div>
                                    <Icon name="chevron_right" size={18} className="text-muted-foreground/50 flex-shrink-0 mt-2" />
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          </motion.div>
                        ))}
                      </motion.div>
                    </TabsContent>

                    <TabsContent value="mindmap">
                      <div className="mt-4">
                        <ConceptMindMap
                          concepts={concepts}
                          chapterTitle={(ch as any).title}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                )}

                {concepts.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Icon name="menu_book" size={48} className="text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">No concepts generated yet. The AI is still processing this chapter.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          }}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
