import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

interface AssignmentSubmittedAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentTitle: string;
  dueDate?: string;
}

export function AssignmentSubmittedAnimation({
  isOpen,
  onClose,
  assignmentTitle,
  dueDate,
}: AssignmentSubmittedAnimationProps) {
  const now = new Date();
  const due = dueDate ? new Date(dueDate) : null;
  const isLate = due !== null && now > due;
  const daysOverdue = due !== null
    ? Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

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
              className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-container"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
            >
              <Icon name="send" className="text-primary" size={48} weight={700} />
            </motion.div>

            <motion.div
              className="flex flex-col gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
            >
              <h2 className="headline-sm text-card-foreground">Assignment Submitted!</h2>
              <p className="body-lg text-muted-foreground">{assignmentTitle}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.4 }}
            >
              {isLate ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-container px-4 py-1.5 title-sm text-warning">
                    <Icon name="schedule" size={18} weight={500} />
                    Submitted late
                  </span>
                  {daysOverdue > 0 && (
                    <span className="body-sm text-muted-foreground">
                      Days overdue: {daysOverdue}
                    </span>
                  )}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-container px-4 py-1.5 title-sm text-success">
                  <Icon name="check_circle" size={18} weight={500} />
                  Submitted on time
                </span>
              )}
            </motion.div>

            <motion.div
              className="flex w-full flex-col gap-3 pt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.3 }}
            >
              <Button size="lg" className="w-full" onClick={onClose}>
                View Submission
                <Icon name="visibility" size={20} className="ml-1" />
              </Button>
              <Button variant="tonal" size="lg" className="w-full" onClick={onClose}>
                <Icon name="arrow_back" size={20} className="mr-1" />
                Back to Assignment
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
