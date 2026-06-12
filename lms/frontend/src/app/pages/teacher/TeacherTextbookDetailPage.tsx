import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/components/ui/Icon';
import { ConceptMindMap } from '@/components/teacher/ConceptMindMap';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { getTextbook, getChaptersForTextbook, getConceptsForChapter } from '@/services/textbookService';
import { getSubject } from '@/services/dataService';
import type { Chapter, Concept } from '@/types/textbook';

interface ChapterWithConcepts extends Chapter {
  conceptsList: Concept[];
}

export default function TeacherTextbookDetailPage() {
  const { textbookId } = useParams<{ textbookId: string }>();

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
    enabled: !!textbookId,
  });

  const allConcepts = (chaptersQuery.data ?? []).flatMap((ch) => ch.conceptsList);

  return (
    <>
      <SEOHead title={textbookQuery.data?.title ?? 'Textbook'} description="View textbook chapters and concepts" />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-6xl mx-auto space-y-6 pb-20">
        <DataFetchWrapper data={textbookQuery.data} isLoading={textbookQuery.isLoading} error={textbookQuery.error} loadingType="detail">
          {(tb) => (
            <>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/teacher/textbooks"><Icon name="arrow_back" size={16} /></Link>
                </Button>
                <div>
                  <h1 className="text-headline-sm">{tb.title}</h1>
                  <p className="text-sm text-muted-foreground">{subjectQuery.data?.name ?? 'Unknown Subject'}</p>
                </div>
              </div>

              <DataFetchWrapper data={chaptersQuery.data} isLoading={chaptersQuery.isLoading} error={chaptersQuery.error} loadingType="list">
                {(chapters) => (
                  <Tabs defaultValue="chapters">
                    <TabsList>
                      <TabsTrigger value="chapters"><Icon name="list" size={14} className="mr-1" />Chapters</TabsTrigger>
                      <TabsTrigger value="mindmap"><Icon name="account_tree" size={14} className="mr-1" />Mind Map</TabsTrigger>
                    </TabsList>

                    <TabsContent value="chapters">
                      <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-3 mt-4">
                        {chapters.map((ch) => (
                          <motion.div key={ch.id} variants={listItem}>
                            <Card variant="elevated">
                              <CardContent className="p-4">
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
                        <ConceptMindMap
                          concepts={allConcepts}
                          chapterTitle={`${tb.title} — All Concepts`}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </DataFetchWrapper>
            </>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
