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
    const channels = configs.map(({ table, queryKey, schema = 'public', event = '*' }) => {
      const channel = supabase
        .channel(`realtime-${table}`)
        .on(
          'postgres_changes' as any,
          { event, schema, table },
          () => {
            queryClient.invalidateQueries({ queryKey });
          },
        )
        .subscribe();

      return channel;
    });

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
    // ponytail: configs reference stable, queryClient is stable ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs, queryClient]);
}
