import { useEffect, useCallback } from 'react';

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
    <>
      {isLoading && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary gap-6"
        >
          <img
            src="/genesis_icon.png"
            alt="Genesis LMS"
            className="h-36 w-auto object-contain"
          />

          <div className="flex flex-col items-center gap-1">
            <h1
              className="text-primary-foreground font-bold text-3xl tracking-tight"
            >
              Genesis
            </h1>

            <p
              className="text-primary-foreground/80 text-sm tracking-widest uppercase"
            >
              Learn &bull; Lead &bull; Achieve
            </p>
          </div>

          <div
            className="flex items-center gap-1.5 mt-2"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block h-2 w-2 rounded-full bg-primary-foreground"
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
