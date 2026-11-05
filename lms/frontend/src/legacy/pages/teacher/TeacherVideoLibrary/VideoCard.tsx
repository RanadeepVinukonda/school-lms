import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from '@/hooks/useTranslation';
import type { TeacherVideo, EducationalVideoSearchResult, YouTubeSearchResult } from './types';

type VideoCardVideo = TeacherVideo | EducationalVideoSearchResult | YouTubeSearchResult;

interface VideoCardProps {
  video: VideoCardVideo;
  onDelete?: () => void;
  onAttach?: () => void;
  onSave?: () => void;
  saved?: boolean;
}

const SOURCE_STYLES: Record<string, string> = {
  khan_academy: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  wikimedia: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  youtube: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function getSourceLabel(video: VideoCardVideo): string {
  return (video as any).sourceLabel || (video as any).source || 'YouTube';
}

function getSource(video: VideoCardVideo): string {
  return (video as any).source || 'youtube';
}

function getThumbnail(video: VideoCardVideo): string {
  return video.thumbnail || `https://img.youtube.com/vi/${(video as any).youtubeId || (video as any).videoId}/hqdefault.jpg`;
}

export function VideoCard({ video, onDelete, onAttach, onSave, saved }: VideoCardProps) {
  const { _ } = useTranslation();
  const source = getSource(video);
  const sourceLabel = getSourceLabel(video);
  return (
    <div>
      <Card className="border-border/60 overflow-hidden hover:shadow-md transition-shadow group h-full">
        <div className="aspect-video bg-muted relative overflow-hidden">
          <img src={getThumbnail(video)} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute top-2 left-2 flex gap-1">
            <Badge className={`text-[10px] px-1.5 py-0.5 font-medium border-0 ${SOURCE_STYLES[source] || SOURCE_STYLES.youtube}`}>
              {sourceLabel}
            </Badge>
          </div>
          <Badge className="absolute bottom-2 right-2 bg-background/80 text-foreground backdrop-blur-sm border-0">
            {video.duration}
          </Badge>
        </div>
        <CardContent className="p-3 space-y-2">
          <h3 className="font-semibold text-sm line-clamp-2 leading-snug">{video.title}</h3>
          <p className="text-xs text-muted-foreground">{video.channelName}</p>
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {onSave && (
              <Button variant={saved ? 'secondary' : 'default'} size="sm" onClick={onSave} disabled={saved} className="gap-1 flex-1">
                <Icon name={saved ? 'check' : 'save'} size={14} />
                {saved ? _('Saved') : _('Save')}
              </Button>
            )}
            {onAttach && (
              <Button variant="outline" size="sm" onClick={onAttach} className="gap-1 flex-1">
                <Icon name="attach_file" size={14} />
                {_('Attach')}
              </Button>
            )}
            {onDelete && (
              <Button variant="destructive" size="sm" onClick={onDelete} className="gap-1 flex-shrink-0">
                <Icon name="delete" size={14} />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
