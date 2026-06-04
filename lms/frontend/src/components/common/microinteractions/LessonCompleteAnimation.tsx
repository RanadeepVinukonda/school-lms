import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { ConfettiEffect } from './ConfettiEffect';
import { cn } from '@/lib/utils';

interface LessonCompleteAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  lessonTitle: string;
  nextLessonId?: string;
  subjectId: string;
  xpEarned?: number;
}

export function LessonCompleteAnimation({
  isOpen,
  onClose,
  lessonTitle,
  xpEarned = 50,
}: LessonCompleteAnimationProps) {
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
            <ConfettiEffect active={isOpen} count={18} />

            <motion.div
              className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-container"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            >
              <Icon name="check_circle" className="text-primary" size={48} weight={700} />
            </motion.div>

            <motion.div
              className="flex flex-col gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
            >
              <h2 className="headline-sm text-card-foreground">Lesson Complete!</h2>
              <p className="body-lg text-muted-foreground">{lessonTitle}</p>
            </motion.div>

            <motion.div
              className="inline-flex items-center gap-2 rounded-full bg-warning-container px-5 py-2"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.4 }}
            >
              <Icon name="stars" className="text-warning" size={20} weight={600} />
              <span className="title-sm text-warning">+{xpEarned} XP</span>
            </motion.div>

            <motion.div
              className="flex w-full flex-col gap-3 pt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.3 }}
            >
              <Button size="lg" className="w-full" onClick={onClose}>
                Continue to Next Lesson
                <Icon name="arrow_forward" size={20} className="ml-1" />
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
