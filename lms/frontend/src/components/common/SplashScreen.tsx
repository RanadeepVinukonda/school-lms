import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  isLoading: boolean;
  onFinish: () => void;
  minimumDuration?: number;
}

const dotVariants = {
  initial: { y: 0 },
  animate: (i: number) => ({
    y: [0, -8, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: 'easeInOut',
      delay: i * 0.15,
    },
  }),
};

export default function SplashScreen({
  isLoading,
  onFinish,
  minimumDuration = 1500,
}: SplashScreenProps) {
  const handleFinish = useCallback(() => {
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(handleFinish, minimumDuration);
    return () => clearTimeout(timer);
  }, [isLoading, minimumDuration, handleFinish]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary gap-6"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <motion.img
            src="/genesis_icon.svg"
            alt="Genesis LMS"
            className="h-36 w-auto object-contain"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />

          <div className="flex flex-col items-center gap-1">
            <motion.h1
              className="text-primary-foreground font-bold text-3xl tracking-tight"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
            >
              Genesis LMS
            </motion.h1>

            <motion.p
              className="text-primary-foreground/80 text-sm tracking-widest uppercase"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35, ease: 'easeOut' }}
            >
              Learn &bull; Lead &bull; Achieve
            </motion.p>
          </div>

          <motion.div
            className="flex items-center gap-1.5 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="block h-2 w-2 rounded-full bg-primary-foreground"
                variants={dotVariants}
                initial="initial"
                animate="animate"
                custom={i}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
