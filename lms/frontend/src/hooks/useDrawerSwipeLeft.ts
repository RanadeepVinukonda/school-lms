import { useRef } from 'react';

interface DrawerSwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

/**
 * Detects a horizontal swipe-left gesture on a left-side drawer and invokes
 * `onSwipeClose` so the mobile navigation can dismiss seamlessly by swiping.
 * A generous horizontal-delta threshold avoids firing on vertical scroll.
 */
export function useDrawerSwipeLeft(onSwipeClose: () => void, minDelta = 72): DrawerSwipeHandlers {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  return {
    onTouchStart: (e) => {
      const touch = e.touches[0];
      if (!touch) return;
      startX.current = touch.clientX;
      startY.current = touch.clientY;
    },
    onTouchEnd: (e) => {
      if (startX.current === null || startY.current === null) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const deltaX = touch.clientX - startX.current;
      const deltaY = touch.clientY - startY.current;
      // Swipe to the left with more horizontal than vertical intent.
      if (deltaX <= -minDelta && Math.abs(deltaY) < Math.abs(deltaX) * 1.6) {
        onSwipeClose();
      }
      startX.current = null;
      startY.current = null;
    },
  };
}