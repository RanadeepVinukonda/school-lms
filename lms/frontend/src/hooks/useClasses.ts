import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { getClassesForCurrentUser, type ClassInfo } from '@/services/classService';

export const CLASSES_QUERY_KEY = ['classes'] as const;

export function useClasses(options?: { enabled?: boolean }) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<ClassInfo[]>({
    queryKey: CLASSES_QUERY_KEY,
    queryFn: getClassesForCurrentUser,
    enabled: !!userId && (options?.enabled ?? true),
    staleTime: 30_000,
    retry: 1,
  });
}

/** Central invalidation point — call after create/assign/register/link/promote/import. */
export function invalidateClasses(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: CLASSES_QUERY_KEY });
}
