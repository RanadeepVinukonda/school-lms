import { type Variants, type Transition } from 'framer-motion';

export const emphasizedEasing = [0.2, 0, 0, 1] as const;
export const standardEasing = [0.2, 0, 0, 1] as const;
export const decelerateEasing = [0, 0, 0, 1] as const;
export const accelerateEasing = [0.3, 0, 1, 1] as const;

export const springTransition: Transition = {
  type: 'tween',
  duration: 0,
};

export const springSlow: Transition = {
  type: 'tween',
  duration: 0,
};

export const pageTransition: Variants = {
  initial: { opacity: 1, y: 0 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0 },
  },
  exit: { opacity: 1, y: 0, transition: { duration: 0 } },
};

export const listContainer: Variants = {
  hidden: {},
  initial: {},
  show: { transition: { staggerChildren: 0 } },
  animate: { transition: { staggerChildren: 0 } },
};

export const listItem: Variants = {
  hidden: { opacity: 1, y: 0 },
  initial: { opacity: 1, y: 0 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0 },
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0 },
  },
};

export const cardHover = {
  whileHover: {},
  transition: { duration: 0 } as Transition,
};

export const fadeIn: Variants = {
  hidden: { opacity: 1 },
  initial: { opacity: 1 },
  show: { opacity: 1, transition: { duration: 0 } },
  animate: { opacity: 1, transition: { duration: 0 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 1, scale: 1 },
  initial: { opacity: 1, scale: 1 },
  show: { opacity: 1, scale: 1, transition: { duration: 0 } },
  animate: { opacity: 1, scale: 1, transition: { duration: 0 } },
};

export const scrollReveal: Variants = {
  hidden: { opacity: 1, y: 0 },
  initial: { opacity: 1, y: 0 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0 },
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0 },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  initial: {},
  show: {
    transition: { staggerChildren: 0 },
  },
  animate: {
    transition: { staggerChildren: 0 },
  },
};

export const scaleFadeIn: Variants = {
  hidden: { opacity: 1, scale: 1, filter: 'brightness(1)' },
  initial: { opacity: 1, scale: 1, filter: 'brightness(1)' },
  show: {
    opacity: 1,
    scale: 1,
    filter: 'brightness(1)',
    transition: { duration: 0 },
  },
  animate: {
    opacity: 1,
    scale: 1,
    filter: 'brightness(1)',
    transition: { duration: 0 },
  },
};

export const slideUpReveal: Variants = {
  hidden: { opacity: 1, y: 0 },
  initial: { opacity: 1, y: 0 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0 },
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0 },
  },
};

export const cardStackReveal: Variants = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  initial: { opacity: 1, y: 0, scale: 1 },
  show: () => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0,
    },
  }),
  animate: () => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0,
    },
  }),
};
