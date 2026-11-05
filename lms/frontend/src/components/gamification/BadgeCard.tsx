import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import type { Badge } from '@/types/gamification';

interface BadgeCardProps {
  badge: Badge;
  earned?: boolean;
  earnedAt?: string;
  index?: number;
}

export function BadgeCard({ badge, earned, earnedAt, index = 0 }: BadgeCardProps) {
  return (
    <div



      className={cn(
        'relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all duration-300',
        earned
          ? 'border-primary/30 bg-primary/5 hover:border-primary/50 hover:shadow-md'
          : 'border-outline-variant bg-surface-variant/30 opacity-60 grayscale',
      )}
    >
      <div className={cn(
        'flex h-14 w-14 items-center justify-center rounded-full',
        earned ? 'bg-primary/10 text-primary' : 'bg-surface-variant text-on-surface-variant',
      )}>
        <Icon name={badge.icon} size={28} />
      </div>
      <div className="space-y-0.5">
        <p className="text-label-sm font-semibold">{badge.name}</p>
        <p className="text-label-xs text-muted-foreground">{badge.description}</p>
      </div>
      {earned && earnedAt && (
        <p className="text-label-xs text-muted-foreground mt-1">Earned {new Date(earnedAt).toLocaleDateString()}</p>
      )}
      {!earned && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/10">
          <Icon name="lock" size={20} className="text-on-surface-variant" />
        </div>
      )}
    </div>
  );
}
