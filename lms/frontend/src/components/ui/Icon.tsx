import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

const weightMap = { 300: 'wght@300', 400: 'wght@400', 500: 'wght@500', 600: 'wght@600', 700: 'wght@700' } as const;

interface IconProps {
  name: string;
  size?: number;
  weight?: keyof typeof weightMap;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 24, weight = 400, className, style }: IconProps) {
  return (
    <span
      className={cn('material-symbols-outlined select-none', className)}
      style={{ fontSize: size, fontVariationSettings: `'FILL' 0, 'GRAD' 0, 'opsz' 48`, ...style }}
      aria-hidden
    >
      {name}
    </span>
  );
}

export function IconFilled({ name, size = 24, weight = 400, className, style }: IconProps) {
  return (
    <span
      className={cn('material-symbols-outlined select-none', className)}
      style={{ fontSize: size, fontVariationSettings: `'FILL' 1, 'GRAD' 0, 'opsz' 48`, ...style }}
      aria-hidden
    >
      {name}
    </span>
  );
}
