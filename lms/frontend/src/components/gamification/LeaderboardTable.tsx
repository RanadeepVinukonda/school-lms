import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import type { LeaderboardEntry } from '@/types/gamification';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  className?: string;
}

const rankColors: Record<number, string> = {
  1: 'text-yellow-500',
  2: 'text-gray-400',
  3: 'text-amber-600',
};

const rankIcons: Record<number, string> = {
  1: 'emoji_events',
  2: 'emoji_events',
  3: 'emoji_events',
};

export function LeaderboardTable({ entries, currentUserId, className }: LeaderboardTableProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {entries.map((entry, i) => (
        <motion.div
          key={entry.userId}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: i * 0.03 }}
          className={cn(
            'flex items-center gap-4 rounded-xl px-4 py-3 transition-colors',
            entry.userId === currentUserId
              ? 'bg-primary/10 border border-primary/20'
              : 'hover:bg-surface-variant/50',
          )}
        >
          <div className="flex w-8 items-center justify-center">
            {entry.rank <= 3 ? (
              <Icon name={rankIcons[entry.rank]} size={24} className={rankColors[entry.rank]} />
            ) : (
              <span className="text-label-lg font-bold text-muted-foreground">{entry.rank}</span>
            )}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-label-sm font-bold text-on-primary-container">
            {entry.displayName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-label-sm font-medium truncate">{entry.displayName}</p>
            <p className="text-label-xs text-muted-foreground">Level {entry.level}</p>
          </div>
          <div className="text-right">
            <p className="text-label-sm font-bold text-primary">{entry.xp.toLocaleString()}</p>
            <p className="text-label-xs text-muted-foreground">XP</p>
          </div>
        </motion.div>
      ))}
      {entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Icon name="leaderboard" size={48} />
          <p className="text-body-sm mt-2">No entries yet</p>
        </div>
      )}
    </div>
  );
}
