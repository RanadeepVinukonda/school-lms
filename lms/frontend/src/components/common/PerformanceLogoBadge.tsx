import { cn } from '@/lib/utils';

interface PerformanceLogoBadgeProps {
  /** Background container classes. Defaults to the standard success container. */
  className?: string;
  /** Logo image size in px inside the badge (default 22). */
  size?: number;
}

export const PERFORMANCE_LOGO_SRC = '/performance-logo.svg';

/**
 * Shared circular badge used by the average-performance stat cards across all
 * portals. Renders the uploaded upward-trend logo centered inside the same
 * colored container as the previous icon so the card layout stays identical.
 */
export function PerformanceLogoBadge({ className, size = 22 }: PerformanceLogoBadgeProps) {
  return (
    <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center shrink-0', className)}>
      <img
        src={PERFORMANCE_LOGO_SRC}
        alt=""
        draggable={false}
        className="object-contain select-none"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
