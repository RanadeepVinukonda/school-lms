import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuthStore } from '@/store/authStore';
import { SEOHead } from '@/components/common/SEOHead';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Icon } from '@/components/ui/Icon';
import { pageTransition, listContainer, listItem } from '@/lib/motion';
import { getTextbook, getChaptersForTextbook, getConceptsForChapter, getAllConceptReleases, setConceptRelease } from '@/services/textbookService';
import { getClass, getAllClasses } from '@/services/dataService';
import { getSubject } from '@/services/dataService';
import type { Chapter, Concept, ConceptRelease } from '@/types/textbook';

interface ChapterWithConcepts extends Chapter {
  conceptsList: Concept[];
}

export default function TeacherTextbookDetailPage() {
  const { textbookId } = useParams<{ textbookId: string }>();
  const user = useAuthStore((s) => s.user);
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
    enabled: !!textbookId,
  });

  const releasesQuery = useQuery({
    queryKey: ['concept-releases', textbookId],
    queryFn: async () => {
      if (!textbookId) return [];
      return getAllConceptReleases(textbookId);
    },
    enabled: !!textbookId,
  });

  const classesQuery = useQuery({
    queryKey: ['all-classes'],
    queryFn: getAllClasses,
  });

  const allConcepts = chaptersQuery.data?.flatMap((ch) => ch.conceptsList) ?? [];

  const releaseMutation = useMutation({
    mutationFn: async ({ conceptId, chapterId, data: relData }: { conceptId: string; chapterId: string; data: { questionBankReleased?: boolean; assignmentsReleased?: boolean } }) => {
      if (!user?.id) return;
      await setConceptRelease(textbookId!, conceptId, chapterId, user.id, relData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concept-releases', textbookId] });
    },
  });

  const batchReleaseMutation = useMutation({
    mutationFn: async ({ questionBankReleased, assignmentsReleased }: { questionBankReleased: boolean; assignmentsReleased: boolean }) => {
      if (!user?.id || !textbookId) return;
      for (const cp of allConcepts) {
        await setConceptRelease(textbookId, cp.id, cp.chapterId, user.id, { questionBankReleased, assignmentsReleased });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['concept-releases', textbookId] });
    },
  });

  const linkClassMutation = useMutation({
    mutationFn: async (classId: string) => {
      const cls = await getClass(classId);
      if (!cls || !textbookQuery.data?.subjectId) return;
      const existingIds = cls.subjectIds ?? [];
      if (existingIds.includes(textbookQuery.data.subjectId)) return;
      const classRef = doc(db, 'classes', classId);
      await updateDoc(classRef, { subjectIds: [...existingIds, textbookQuery.data.subjectId] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-classes'] });
    },
  });

  const isReleased = (conceptId: string, field: 'questionBankReleased' | 'assignmentsReleased') => {
    return (releasesQuery.data ?? []).find((r) => r.conceptId === conceptId)?.[field] ?? false;
  };

  const releaseCount = (field: 'questionBankReleased' | 'assignmentsReleased') => {
    return allConcepts.filter((c) => isReleased(c.id, field)).length;
  };

  const linkedClassIds = classesQuery.data?.filter((c) =>
    textbookQuery.data?.subjectId && (c.subjectIds ?? []).includes(textbookQuery.data.subjectId),
  ) ?? [];

  const unlinkedClasses = classesQuery.data?.filter((c) =>
    !(textbookQuery.data?.subjectId && (c.subjectIds ?? []).includes(textbookQuery.data.subjectId)),
  ) ?? [];

  return (
    <>
      <SEOHead title={textbookQuery.data?.title ?? 'Textbook'} description="Manage textbook chapters and release content to students" />
      <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="p-4 max-w-5xl mx-auto space-y-6 pb-20">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{allConcepts.length}</p>
                    <p className="text-xs text-muted-foreground">Concepts</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{allConcepts.reduce((s, c) => s + c.questionBank.length, 0)}</p>
                    <p className="text-xs text-muted-foreground">Questions</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{allConcepts.reduce((s, c) => s + c.assignments.length, 0)}</p>
                    <p className="text-xs text-muted-foreground">Assignments</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold flex items-center gap-2 text-sm">
                      <Icon name="publish" size={16} className="text-primary" />
                      Batch Release to Students
                    </h2>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => batchReleaseMutation.mutate({ questionBankReleased: true, assignmentsReleased: true })} disabled={batchReleaseMutation.isPending}>
                        <Icon name="check_circle" size={14} className="mr-1" />
                        Release All ({allConcepts.length} concepts)
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => batchReleaseMutation.mutate({ questionBankReleased: false, assignmentsReleased: false })} disabled={batchReleaseMutation.isPending}>
                        Release None
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{releaseCount('questionBankReleased')}/{allConcepts.length}</Badge>
                      Practice questions released
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{releaseCount('assignmentsReleased')}/{allConcepts.length}</Badge>
                      Assignments released
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold flex items-center gap-2 text-sm">
                      <Icon name="group" size={16} className="text-primary" />
                      Link to Class
                    </h2>
                  </div>
                  {linkedClassIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {linkedClassIds.map((cls) => (
                        <Badge key={cls.id} variant="secondary" className="text-xs">
                          <Icon name="school" size={12} className="mr-1" />
                          {cls.name} ({cls.code})
                        </Badge>
                      ))}
                    </div>
                  )}
                  {unlinkedClasses.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {unlinkedClasses.map((cls) => (
                        <Button key={cls.id} variant="outline" size="sm" onClick={() => linkClassMutation.mutate(cls.id)} disabled={linkClassMutation.isPending}>
                          <Icon name="add" size={14} className="mr-1" />
                          Link {cls.name}
                        </Button>
                      ))}
                    </div>
                  )}
                  {classesQuery.data?.length === 0 && (
                    <p className="text-sm text-muted-foreground">No classes found. Create one in Admin first.</p>
                  )}
                </CardContent>
              </Card>

              <DataFetchWrapper data={chaptersQuery.data} isLoading={chaptersQuery.isLoading} error={chaptersQuery.error} loadingType="list">
                {(chapters) => (
                  <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-3">
                    {chapters.map((ch) => (
                      <motion.div key={ch.id} variants={listItem}>
                        <Card variant="elevated">
                          <CardContent className="p-4">
                            <h3 className="font-semibold">
                              {ch.order + 1}. {ch.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">{ch.description}</p>
                            <div className="mt-3 space-y-2">
                              {ch.conceptsList.map((cp) => {
                                const qReleased = isReleased(cp.id, 'questionBankReleased');
                                const aReleased = isReleased(cp.id, 'assignmentsReleased');
                                return (
                                  <div key={cp.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/30">
                                    <Link to={`/teacher/textbooks/${textbookId}/chapters/${ch.id}/concepts/${cp.id}`} className="text-sm font-medium hover:text-primary flex items-center gap-2 flex-1 min-w-0">
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary/50 flex-shrink-0" />
                                      <span className="truncate">{cp.title}</span>
                                    </Link>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                        <Icon name="quiz" size={12} />
                                        {cp.questionBank.length}
                                      </div>
                                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                        <Icon name="assignment" size={12} />
                                        {cp.assignments.length}
                                      </div>
                                      <Switch
                                        checked={qReleased}
                                        onCheckedChange={(checked) => releaseMutation.mutate({ conceptId: cp.id, chapterId: ch.id, data: { questionBankReleased: checked } })}
                                        className="scale-75"
                                        title="Toggle questions"
                                      />
                                      <Switch
                                        checked={aReleased}
                                        onCheckedChange={(checked) => releaseMutation.mutate({ conceptId: cp.id, chapterId: ch.id, data: { assignmentsReleased: checked } })}
                                        className="scale-75"
                                        title="Toggle assignments"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </DataFetchWrapper>
            </>
          )}
        </DataFetchWrapper>
      </motion.div>
    </>
  );
}
