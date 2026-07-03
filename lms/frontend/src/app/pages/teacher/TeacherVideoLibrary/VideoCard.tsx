import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { cardStackReveal } from '@/lib/motion';
import { useTranslation } from '@/hooks/useTranslation';
import type { TeacherVideo, YouTubeSearchResult } from './types';

interface VideoCardProps {
  video: TeacherVideo | YouTubeSearchResult;
  onDelete?: () => void;
  onAttach?: () => void;
  onSave?: () => void;
  saved?: boolean;
}

export function VideoCard({ video, onDelete, onAttach, onSave, saved }: VideoCardProps) {
  const { _ } = useTranslation();
  return (
    <motion.div variants={cardStackReveal} custom={0}>
      <Card className="border-border/60 overflow-hidden hover:shadow-md transition-shadow group h-full">
        <div className="aspect-video bg-muted relative overflow-hidden">
          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
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
    </motion.div>
  );
}
