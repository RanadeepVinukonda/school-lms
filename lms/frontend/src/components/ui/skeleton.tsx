import * as React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shape?: 'default' | 'circular' | 'pill';
}

function Skeleton({ className, shape = 'default', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'shimmer',
        shape === 'circular' && 'rounded-full',
        shape === 'pill' && 'rounded-full',
        shape === 'default' && 'rounded-lg',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
