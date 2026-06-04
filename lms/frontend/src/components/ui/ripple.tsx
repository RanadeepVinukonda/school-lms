import { cn } from '@/lib/utils';

interface RippleProps {
  className?: string;
  children: React.ReactNode;
}

function Ripple({ className, children }: RippleProps) {
  return <div className={cn('ripple', className)}>{children}</div>;
}

export { Ripple };
