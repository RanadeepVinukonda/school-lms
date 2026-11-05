import { ResourceCard, ResourceCardSkeleton } from '@/components/resources/ResourceCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import type { DetectableResource } from '@/lib/resourceUtils';

interface ResourceCardGridProps {
  items?: DetectableResource[] | null;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyTitle?: string;
  metaFor?: (item: DetectableResource) => string | undefined;
  actionFor?: (item: DetectableResource) => React.ReactNode;
  onOpen?: (item: DetectableResource) => void;
  skeletonCount?: number;
  className?: string;
}

/** Responsive premium grid of ResourceCards with skeletons + empty state. */
export function ResourceCardGrid({
  items,
  isLoading,
  emptyMessage = 'Nothing here yet',
  emptyTitle = 'No resources yet',
  metaFor,
  actionFor,
  onOpen,
  skeletonCount = 6,
  className,
}: ResourceCardGridProps) {
  if (isLoading) {
    return (
      <div className={cn('grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', className)}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ResourceCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        message={emptyMessage}
        icon={<Icon name="video_library" size={40} />}
      />
    );
  }

  return (
    <div className={cn('grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {items.map((item, i) => (
        <ResourceCard
          key={item.id || i}
          resource={item}
          meta={metaFor?.(item)}
          action={actionFor?.(item)}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
