import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/supabase/config';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeSubscriptionOptions {
  /** The database table name to subscribe to */
  table: string;
  /** Optional filter: 'INSERT' | 'UPDATE' | 'DELETE' | '*' (default: '*') */
  event?: RealtimeEvent;
  /** Optional filter: column name for equality filter */
  filter?: { column: string; value: string | number };
  /** Callback when an event is received */
  callback: (payload: Record<string, unknown>) => void;
}

/**
 * Subscribe to a Supabase Realtime channel with automatic cleanup on unmount.
 * Returns an unsubscribe function for manual cleanup.
 *
 * @example
 * ```ts
 * useRealtimeSubscription({
 *   table: 'grades',
 *   event: 'INSERT',
 *   filter: { column: 'studentId', value: userId },
 *   callback: (payload) => { refetchGrades(); },
 * });
 * ```
 */
export function useRealtimeSubscription({
  table,
  event = '*',
  filter,
  callback,
}: UseRealtimeSubscriptionOptions): () => void {
  const callbackRef = useRef(callback);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Keep callback ref current
  callbackRef.current = callback;

  useEffect(() => {
    const channelName = `${table}_${event}_${filter ? `${filter.column}_${filter.value}` : 'all'}`;

    const realtimeChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          filter: filter ? `${filter.column}=eq.${filter.value}` : undefined,
        },
        (payload) => {
          callbackRef.current(payload as unknown as Record<string, unknown>);
        },
      )
      .subscribe();

    channelRef.current = realtimeChannel;

    return () => {
      supabase.removeChannel(realtimeChannel);
      channelRef.current = null;
    };
  }, [table, event, filter?.column, filter?.value]);

  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
}
