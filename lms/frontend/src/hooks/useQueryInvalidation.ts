import { useQueryClient } from '@tanstack/react-query';

export function useQueryInvalidation() {
  const queryClient = useQueryClient();

  const invalidate = (...keys: string[]) => {
    keys.forEach((key) => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  };

  return { invalidate, queryClient };
}
