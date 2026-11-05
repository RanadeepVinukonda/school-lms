import { useTranslation } from '@/hooks/useTranslation';

interface TProps {
  path: string;
  fallback?: string;
}

export function T({ path, fallback }: TProps) {
  const { t } = useTranslation();
  const val = t(path as any);
  return <>{val === path ? (fallback || path) : val}</>;
}

export default T;
