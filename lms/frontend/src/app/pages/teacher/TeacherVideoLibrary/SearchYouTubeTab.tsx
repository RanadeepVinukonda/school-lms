import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DataFetchWrapper } from '@/components/common/DataFetchWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/Icon';
import { staggerContainer } from '@/lib/motion';
import api from '@/services/api';
import { VideoCard } from './VideoCard';
import type { TeacherVideo, YouTubeSearchResult } from './types';

export function SearchYouTubeTab() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const savedVideosQuery = useQuery({
    queryKey: ['teacher-videos'],
    queryFn: () => api.get('/api/teacher-videos').then((r) => r.data.data as TeacherVideo[]),
  });

  const searchResultsQuery = useQuery({
    queryKey: ['youtube-search', searchQuery],
    queryFn: () =>
      api
        .get('/api/youtube/search', { params: { query: searchQuery, maxResults: 12 } })
        .then((r) => r.data.data as YouTubeSearchResult[]),
    enabled: searchQuery.length > 0,
  });

  const saveMutation = useMutation({
    mutationFn: (video: YouTubeSearchResult) =>
      api.post('/api/teacher-videos', {
        title: video.title,
        youtubeId: video.youtubeId,
        thumbnail: video.thumbnail,
        duration: video.duration,
        channelName: video.channelName,
        description: video.description,
        embedUrl: video.embedUrl,
      }),
    onSuccess: () => {
      toast.success('Video saved to your library');
      queryClient.invalidateQueries({ queryKey: ['teacher-videos'] });
    },
    onError: () => toast.error('Failed to save video'),
  });

  const searchAndSaveMutation = useMutation({
    mutationFn: (sq: string) =>
      api.post('/api/teacher-videos/search-and-save', { query: sq, maxResults: 12 }),
    onSuccess: (res) => {
      const count = res.data?.data?.length ?? 0;
      toast.success(`Saved ${count} video${count !== 1 ? 's' : ''}`);
      queryClient.invalidateQueries({ queryKey: ['teacher-videos'] });
      queryClient.invalidateQueries({ queryKey: ['youtube-search'] });
    },
    onError: () => toast.error('Failed to search and save videos'),
  });

  const savedVideoIds = new Set(
    (savedVideosQuery.data ?? []).map((v) => v.youtubeId),
  );

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setSearchQuery(query.trim());
  }, [query]);

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search YouTube for educational videos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" disabled={!query.trim()} className="gap-2">
          <Icon name="search" size={16} />
          Search
        </Button>
        {searchQuery && (
          <Button
            type="button"
            variant="outline"
            onClick={() => searchAndSaveMutation.mutate(searchQuery)}
            loading={searchAndSaveMutation.isPending}
            className="gap-2"
          >
            <Icon name="playlist_add" size={16} />
            Save All
          </Button>
        )}
      </form>

      {!searchQuery && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-5 text-muted-foreground/40">
            <Icon name="smart_display" size={64} />
          </div>
          <h3 className="text-headline-sm mb-1">Search YouTube Videos</h3>
          <p className="text-body-md text-muted-foreground max-w-sm">
            Find educational videos to add to your library. Search by topic, keyword, or subject.
          </p>
        </div>
      )}

      {searchQuery && (
        <DataFetchWrapper
          data={searchResultsQuery.data}
          isLoading={searchResultsQuery.isLoading}
          error={searchResultsQuery.error}
          onRetry={() => searchResultsQuery.refetch()}
          loadingType="card"
          emptyMessage={`No results found for "${searchQuery}"`}
          emptyAction={
            <Button variant="outline" onClick={() => setSearchQuery('')} className="gap-2">
              <Icon name="refresh" size={16} />
              Try another search
            </Button>
          }
        >
          {(results) => (
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
              {results.map((video) => (
                <VideoCard
                  key={video.youtubeId}
                  video={video}
                  saved={savedVideoIds.has(video.youtubeId)}
                  onSave={() => saveMutation.mutate(video)}
                />
              ))}
            </motion.div>
          )}
        </DataFetchWrapper>
      )}
    </div>
  );
}
