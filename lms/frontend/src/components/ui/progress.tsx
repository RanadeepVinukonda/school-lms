import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  indicatorClassName?: string;
  variant?: 'linear' | 'circular';
  size?: 'sm' | 'default' | 'lg';
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, indicatorClassName, variant = 'linear', size = 'default', ...props }, ref) => {
  if (variant === 'circular') {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - ((value || 0) / 100) * circumference;
    const sizePx = size === 'sm' ? 24 : size === 'lg' ? 48 : 36;
    const strokeWidth = size === 'sm' ? 2 : size === 'lg' ? 4 : 3;

    return (
      <svg
        width={sizePx}
        height={sizePx}
        className={cn('rotate-[-90deg]', className)}
        ref={ref as React.Ref<SVGSVGElement>}
        {...(props as React.SVGProps<SVGSVGElement>)}
      >
        <circle
          cx={sizePx / 2}
          cy={sizePx / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--surface-variant))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={sizePx / 2}
          cy={sizePx / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-all duration-500 ease-out', indicatorClassName)}
        />
      </svg>
    );
  }

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        'relative w-full overflow-hidden bg-surface-variant',
        size === 'sm' && 'h-1 rounded-full',
        size === 'default' && 'h-1.5 rounded-full',
        size === 'lg' && 'h-2 rounded-full',
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          'h-full w-full flex-1 bg-primary transition-all duration-500 ease-out rounded-full',
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
