'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { getBackTarget, NAVIGATE_EVENT, requestBack } from '@/lib/backNavigation';

export function BackButton({ className }: { className?: string }) {
  const pathname = usePathname();
  const target = getBackTarget(pathname);

  if (!target) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('shrink-0 text-on-surface', className)}
      aria-label="Go back"
      title="Go back"
      onClick={() => requestBack(pathname)}
    >
      <Icon name="arrow_back" size={24} />
    </Button>
  );
}

export function NavigationBridge() {
  const router = useRouter();

  useEffect(() => {
    const handler = (event: Event) => {
      const path = (event as CustomEvent<string>).detail;
      if (typeof path === 'string' && path.startsWith('/')) {
        router.push(path);
      }
    };

    window.addEventListener(NAVIGATE_EVENT, handler);
    return () => window.removeEventListener(NAVIGATE_EVENT, handler);
  }, [router]);

  return null;
}
