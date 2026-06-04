import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const CONFETTI_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--tertiary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  '#ff6b9d',
  '#7c3aed',
];

interface Particle {
  id: number;
  color: string;
  angle: number;
  velocity: number;
  size: number;
  rotation: number;
  shape: 'circle' | 'square';
}

interface ConfettiEffectProps {
  active: boolean;
  count?: number;
}

export function ConfettiEffect({ active, count = 20 }: ConfettiEffectProps) {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      angle: Math.random() * 360,
      velocity: 200 + Math.random() * 300,
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 720 - 360,
      shape: Math.random() > 0.5 ? 'circle' : 'square',
    }));
  }, [count]);

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const endX = Math.cos(rad) * p.velocity;
        const endY = Math.sin(rad) * p.velocity;
        return (
          <motion.div
            key={p.id}
            className={cn('absolute', p.shape === 'circle' ? 'rounded-full' : 'rounded-sm')}
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              left: '50%',
              top: '50%',
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
            }}
            initial={{ opacity: 1, scale: 1 }}
            animate={{
              x: endX,
              y: endY,
              opacity: [1, 1, 0],
              rotate: p.rotation,
              scale: [1, 0.8, 0.3],
            }}
            transition={{
              duration: 1 + Math.random() * 0.8,
              ease: 'easeOut',
            }}
          />
        );
      })}
    </div>
  );
}
