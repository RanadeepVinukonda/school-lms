import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabase/config';

type RealtimeConfig = {
  table: string;
  queryKey: string[];
  schema?: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
};

export function useRealtimeInvalidation(configs: RealtimeConfig[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channels: RealtimeChannel[] = [];
    for (const { table, queryKey, schema = 'public', event = '*' } of configs) {
      try {
        const channel = supabase
          .channel(`realtime-${table}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
          .on(
            'postgres_changes' as any,
            { event, schema, table },
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
    // ponytail: configs reference stable, queryClient is stable ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs, queryClient]);
}
