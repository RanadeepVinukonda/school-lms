import { type Variants, type Transition } from 'framer-motion';

export const emphasizedEasing = [0.05, 0, 0.133333, 0.06] as const;
export const standardEasing = [0.2, 0, 0, 1] as const;
export const decelerateEasing = [0, 0, 0, 1] as const;
export const accelerateEasing = [0.3, 0, 1, 1] as const;

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 700,
  damping: 0.9,
  mass: 1,
};

export const springSlow: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 0.8,
  mass: 1,
};

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 28, mass: 0.8 },
  },
  exit: { opacity: 0, y: -12, transition: { duration: 0.15, ease: accelerateEasing } },
};

export const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 25, mass: 0.8 },
  },
};

export const cardHover = {
  whileHover: { y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  transition: { type: 'spring', stiffness: 700, damping: 0.9 } as Transition,
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, ease: standardEasing } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: emphasizedEasing } },
};
