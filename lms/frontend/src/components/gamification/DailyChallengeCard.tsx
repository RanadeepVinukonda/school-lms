import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DailyChallenge } from '@/types/gamification';

interface DailyChallengeCardProps {
  challenge: DailyChallenge;
  onComplete: (id: string) => void;
  completing?: boolean;
  index?: number;
}

export function DailyChallengeCard({ challenge, onComplete, completing, index = 0 }: DailyChallengeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className={cn(
        'flex items-center gap-4 rounded-xl border p-4 transition-all duration-300',
        challenge.completed
          ? 'border-success/30 bg-success/5'
          : 'border-outline-variant hover:border-primary/30',
      )}
    >
      <div className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
        challenge.completed ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary',
      )}>
        <Icon name={challenge.completed ? 'check_circle' : 'radio_button_unchecked'} size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-label-sm font-semibold">{challenge.title}</p>
        <p className="text-label-xs text-muted-foreground">{challenge.description}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-0.5 text-label-xs text-amber-600">
            <Icon name="stars" size={14} /> +{challenge.xpReward} XP
          </span>
          <span className="flex items-center gap-0.5 text-label-xs text-yellow-600">
            <Icon name="monetization_on" size={14} /> +{challenge.coinReward}
          </span>
        </div>
      </div>
      <Button
        variant={challenge.completed ? 'ghost' : 'primary'}
        size="sm"
        disabled={challenge.completed || completing}
        onClick={() => onComplete(challenge.id)}
        className="shrink-0"
      >
        {challenge.completed ? 'Done' : completing ? '...' : 'Claim'}
      </Button>
    </motion.div>
  );
}
