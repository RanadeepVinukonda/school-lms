import { useEffect, useCallback } from 'react';

interface SplashScreenProps {
  isLoading: boolean;
  onFinish: () => void;
  minimumDuration?: number;
}

const dotKeyframes = `
@keyframes dot-bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-8px); }
}`;

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
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white gap-6"
        >
          <img
            src="/genesis_icon.png"
            alt="Genesis LMS"
            className="h-36 w-auto object-contain"
          />

          <div className="flex flex-col items-center gap-1">
            <h1
              className="text-slate-900 font-bold text-3xl tracking-tight"
            >
              Genesis
            </h1>

            <p
              className="text-slate-500 text-sm tracking-widest uppercase"
            >
              Learn &bull; Lead &bull; Achieve
            </p>
          </div>

          <style>{dotKeyframes}</style>
          <div className="flex items-center gap-1.5 mt-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block h-2 w-2 rounded-full bg-slate-900"
                style={{
                  animation: `dot-bounce 0.6s ease-in-out ${i * 0.15}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
