import { useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface ExamPassedAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  totalScore: number;
  percentage: number;
  grade: string;
  passed: boolean;
}

const SIZE = 160;
const STROKE_WIDTH = 12;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ExamPassedAnimation({
  isOpen,
  onClose,
  score,
  totalScore,
  percentage,
  grade,
  passed,
}: ExamPassedAnimationProps) {
  const countMotion = useMotionValue(0);
  const countDisplay = useTransform(countMotion, (v) => Math.round(v));

  useEffect(() => {
    if (isOpen) {
      const controls = animate(countMotion, score, {
        type: 'spring',
        stiffness: 100,
        damping: 20,
        restDelta: 0.5,
      });
      return controls.stop;
    }
  }, [isOpen, score, countMotion]);

  const progress = Math.min(percentage / 100, 1);
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={cn(
              'relative w-full max-w-md rounded-3xl bg-card p-8 shadow-elevation-5',
              'flex flex-col items-center gap-6 text-center'
            )}
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.8 }}
          >
            <motion.div
              className={cn(
                'flex h-20 w-20 items-center justify-center rounded-full',
                passed ? 'bg-success-container' : 'bg-error-container'
              )}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
            >
              <Icon
                name={passed ? 'emoji_events' : 'sentiment_dissatisfied'}
                className={passed ? 'text-success' : 'text-error'}
                size={48}
                weight={700}
              />
            </motion.div>

            <motion.div
              className="flex flex-col gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
            >
              <h2 className="headline-sm text-card-foreground">
                {passed ? 'Congratulations!' : 'Keep Trying!'}
              </h2>
            </motion.div>

            <div className="relative flex items-center justify-center">
              <svg width={SIZE} height={SIZE} className="-rotate-90">
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke="hsl(var(--surface-variant))"
                  strokeWidth={STROKE_WIDTH}
                />
                <motion.circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={passed ? 'hsl(var(--success))' : 'hsl(var(--error))'}
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  initial={{ strokeDashoffset: CIRCUMFERENCE }}
                  animate={{ strokeDashoffset }}
                  transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.3 }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <motion.span className="headline-lg text-card-foreground">
                  {countDisplay}
                </motion.span>
                <span className="body-sm text-muted-foreground">
                  / {totalScore}
                </span>
              </div>
            </div>

            <motion.div
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-5 py-2',
                passed ? 'bg-success-container' : 'bg-error-container'
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              <span
                className={cn(
                  'title-sm',
                  passed ? 'text-success' : 'text-error'
                )}
              >
                Grade: {grade}
              </span>
            </motion.div>

            {!passed && (
              <motion.p
                className="body-md text-muted-foreground max-w-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.3 }}
              >
                Don't give up! Review the material and try again. You'll get it next time.
              </motion.p>
            )}

            <motion.div
              className="flex w-full flex-col gap-3 pt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.3 }}
            >
              <Button size="lg" className="w-full" onClick={onClose}>
                View Full Results
                <Icon name="assessment" size={20} className="ml-1" />
              </Button>
              <Button variant="tonal" size="lg" className="w-full" onClick={onClose}>
                <Icon name="arrow_back" size={20} className="mr-1" />
                Back to Subject
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
