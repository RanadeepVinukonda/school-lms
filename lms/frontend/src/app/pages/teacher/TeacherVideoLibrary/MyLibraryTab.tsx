import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/services/api';
import { VideoCard } from './VideoCard';
import type { TeacherVideo } from './types';
import type { Textbook, Chapter, Concept } from '@/types/textbook';

interface MyLibraryTabProps {
  onTabChange: (tab: string) => void;
}

export function MyLibraryTab({ onTabChange }: MyLibraryTabProps) {
  const { _ } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedTextbookId, setSelectedTextbookId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [selectedConceptId, setSelectedConceptId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TeacherVideo | null>(null);
  const videosQuery = useQuery({
    queryKey: ['teacher-videos'],
    queryFn: () => api.get('/api/teacher-videos').then((r) => r.data.data as TeacherVideo[]),
  });

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

  const deleteMutation = useMutation({
    mutationFn: (videoId: string) => api.delete(`/api/teacher-videos/${videoId}`),
    onSuccess: () => {
      toast.success(_('Video removed from library'));
      queryClient.invalidateQueries({ queryKey: ['teacher-videos'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error(_('Failed to delete video')),
  });

  const textbooks = textbooksQuery.data ?? [];
  const chapters = chaptersQuery.data ?? [];
  const concepts = conceptsQuery.data ?? [];
  const allVideos = videosQuery.data ?? [];
  const filteredVideos = allVideos.filter((v) => {
    if (selectedTextbookId && v.textbookId !== selectedTextbookId) return false;
    if (selectedChapterId && v.chapterId !== selectedChapterId) return false;
    if (selectedConceptId && v.conceptId !== selectedConceptId) return false;
    return true;
  });

  const attachedCount = allVideos.filter((v) => v.conceptId).length;
  const unattachedCount = allVideos.filter((v) => !v.conceptId).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon name="video_library" size={18} />
          <span>{allVideos.length} {_('video')}{allVideos.length !== 1 ? _('s') : ''}</span>
          <span className="text-muted-foreground/50">|</span>
          <span>{attachedCount} {_('attached')}</span>
          <span className="text-muted-foreground/50">|</span>
          <span>{unattachedCount} {_('unattached')}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
          <Select value={selectedTextbookId} onValueChange={(v) => { setSelectedTextbookId(v); setSelectedChapterId(''); setSelectedConceptId(''); }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={_('All textbooks')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{_('All textbooks')}</SelectItem>
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
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={_('All chapters')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{_('All chapters')}</SelectItem>
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
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={_('All concepts')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{_('All concepts')}</SelectItem>
              {concepts.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataFetchWrapper
        data={filteredVideos}
        isLoading={videosQuery.isLoading}
        error={videosQuery.error}
        onRetry={() => videosQuery.refetch()}
        loadingType="card"
        emptyMessage={
          selectedTextbookId || selectedChapterId || selectedConceptId
            ? _('No videos match the selected filters')
            : _('Your video library is empty. Search YouTube to add videos.')
        }
        emptyAction={
          !selectedTextbookId && !selectedChapterId && !selectedConceptId ? (
            <Button onClick={() => onTabChange('search')} className="gap-2">
              <Icon name="search" size={16} />
              {_('Search Videos')}
            </Button>
          ) : undefined
        }
      >
        {(videos) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onDelete={() => setDeleteTarget(video)}
                onAttach={() => onTabChange('attach')}
              />
            ))}
          </div>
        )}
      </DataFetchWrapper>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title={_('Delete Video')}
        description={_('Remove') + ` "${deleteTarget?.title}" ` + _('from your video library? This action cannot be undone.')}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        confirmText={_('Delete')}
        destructive
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
