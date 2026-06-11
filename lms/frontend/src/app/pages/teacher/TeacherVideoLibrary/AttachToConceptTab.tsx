import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Icon } from '@/components/ui/Icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listContainer } from '@/lib/motion';
import api from '@/services/api';
import { VideoCard } from './VideoCard';
import type { TeacherVideo } from './types';
import type { Textbook, Chapter, Concept } from '@/types/textbook';

export function AttachToConceptTab() {
  const queryClient = useQueryClient();
  const [selectedTextbookId, setSelectedTextbookId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [selectedConceptId, setSelectedConceptId] = useState('');

  const textbooksQuery = useQuery({
    queryKey: ['teacher-textbooks-simple'],
    queryFn: () => api.get('/api/textbooks').then((r) => r.data.data as Textbook[]),
  });

  const chaptersQuery = useQuery({
    queryKey: ['teacher-chapters', selectedTextbookId],
    queryFn: () =>
      api.get(`/api/textbooks/${selectedTextbookId}/chapters`).then((r) => r.data.data as Chapter[]),
    enabled: !!selectedTextbookId,
  });

  const conceptsQuery = useQuery({
    queryKey: ['teacher-concepts', selectedTextbookId, selectedChapterId],
    queryFn: () =>
      api
        .get(`/api/textbooks/${selectedTextbookId}/chapters/${selectedChapterId}/concepts`)
        .then((r) => r.data.data as Concept[]),
    enabled: !!selectedTextbookId && !!selectedChapterId,
  });

  const videosQuery = useQuery({
    queryKey: ['teacher-videos'],
    queryFn: () => api.get('/api/teacher-videos').then((r) => r.data.data as TeacherVideo[]),
  });

  const attachMutation = useMutation({
    mutationFn: ({ videoId, textbookId, chapterId, conceptId }: { videoId: string; textbookId: string; chapterId: string; conceptId: string }) =>
      api.put(`/api/teacher-videos/${videoId}/attach`, { textbookId, chapterId, conceptId }),
    onSuccess: () => {
      toast.success('Video attached to concept');
      queryClient.invalidateQueries({ queryKey: ['teacher-videos'] });
    },
    onError: () => toast.error('Failed to attach video'),
  });

  const detachMutation = useMutation({
    mutationFn: (videoId: string) =>
      api.put(`/api/teacher-videos/${videoId}/attach`, {}),
    onSuccess: () => {
      toast.success('Video detached from concept');
      queryClient.invalidateQueries({ queryKey: ['teacher-videos'] });
    },
    onError: () => toast.error('Failed to detach video'),
  });

  const textbooks = textbooksQuery.data ?? [];
  const chapters = chaptersQuery.data ?? [];
  const concepts = conceptsQuery.data ?? [];
  const allVideos = videosQuery.data ?? [];

  const unattachedVideos = allVideos.filter((v) => !v.conceptId || (
    selectedConceptId ? v.conceptId !== selectedConceptId : true
  ));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          Select a concept then attach videos from your library:
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedTextbookId} onValueChange={(v) => { setSelectedTextbookId(v); setSelectedChapterId(''); setSelectedConceptId(''); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select textbook" />
            </SelectTrigger>
            <SelectContent>
              {textbooks.map((tb) => (
                <SelectItem key={tb.id} value={tb.id}>{tb.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedChapterId}
            onValueChange={(v) => { setSelectedChapterId(v); setSelectedConceptId(''); }}
            disabled={!selectedTextbookId}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select chapter" />
            </SelectTrigger>
            <SelectContent>
              {chapters.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedConceptId}
            onValueChange={setSelectedConceptId}
            disabled={!selectedChapterId}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select concept" />
            </SelectTrigger>
            <SelectContent>
              {concepts.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedConceptId && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-5 text-muted-foreground/40">
            <Icon name="attach_file" size={64} />
          </div>
          <h3 className="text-headline-sm mb-1">Attach Videos to Concepts</h3>
          <p className="text-body-md text-muted-foreground max-w-sm">
            Select a textbook, chapter, and concept above to attach videos from your library.
          </p>
        </div>
      )}

      {selectedConceptId && (
        <DataFetchWrapper
          data={unattachedVideos}
          isLoading={videosQuery.isLoading}
          error={videosQuery.error}
          onRetry={() => videosQuery.refetch()}
          loadingType="card"
          emptyMessage="All videos are already attached to this concept or your library is empty"
        >
          {(videos) => (
            <motion.div variants={listContainer} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video) => {
                const isAttachedHere = video.conceptId === selectedConceptId;
                return (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onDelete={undefined}
                    onAttach={
                      isAttachedHere
                        ? () => detachMutation.mutate(video.id)
                        : () =>
                            attachMutation.mutate({
                              videoId: video.id,
                              textbookId: selectedTextbookId,
                              chapterId: selectedChapterId,
                              conceptId: selectedConceptId,
                            })
                    }
                  />
                );
              })}
            </motion.div>
          )}
        </DataFetchWrapper>
      )}
    </div>
  );
}
