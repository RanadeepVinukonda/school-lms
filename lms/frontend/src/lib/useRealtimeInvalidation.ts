import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabase/config';
import type { RealtimeChannel } from '@supabase/supabase-js';

type RealtimeConfig = {
  table: string;
  queryKey: string[];
  schema?: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  /** Optional equality filter, e.g. { column: 'userId', value: userId } */
  filter?: { column: string; value: string | number };
};

export function useRealtimeInvalidation(configs: RealtimeConfig[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channels: RealtimeChannel[] = [];
    for (const { table, queryKey, schema = 'public', event = '*', filter } of configs) {
      try {
        const channel = supabase
          .channel(`realtime-${table}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
          .on(
            'postgres_changes' as any,
            {
              event,
              schema,
              table,
              filter: filter ? `${filter.column}=eq.${filter.value}` : undefined,
            },
            () => {
              queryClient.invalidateQueries({ queryKey });
            },
          )
          .subscribe();
        channels.push(channel);
      } catch {
        // ponytail: individual channel failure shouldn't crash page
      }
    }

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [configs, queryClient]);
}
