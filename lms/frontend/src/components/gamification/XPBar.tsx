import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface XPBarProps {
  xp: number;
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  className?: string;
}

export function XPBar({ xp, level, xpForCurrentLevel, xpForNextLevel, className }: XPBarProps) {
  const xpInLevel = xp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progress = xpNeeded > 0 ? Math.min((xpInLevel / xpNeeded) * 100, 100) : 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-label-xl font-bold text-primary">Lv.{level}</span>
          <span className="text-label-sm text-muted-foreground">{xp.toLocaleString()} XP</span>
        </div>
        <span className="text-label-sm text-muted-foreground">{xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP</span>
      </div>
      <div className="relative">
        <Progress value={progress} size="lg" />
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/30 via-primary/10 to-transparent"
          style={{ transformOrigin: 'left' }}
        />
      </div>
    </div>
  );
}
