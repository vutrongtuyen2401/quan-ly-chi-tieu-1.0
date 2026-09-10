import { Variants } from "motion/react";

/**
 * Spring & Easing Presets for Premium Fintech Motion
 */
export const springTransition = {
  type: "spring" as const,
  stiffness: 350,
  damping: 30,
};

export const softSpring = {
  type: "spring" as const,
  stiffness: 260,
  damping: 24,
};

export const gentleSpring = {
  type: "spring" as const,
  stiffness: 180,
  damping: 22,
};

export const springConfig = {
  snappy: {
    type: "spring" as const,
    stiffness: 350,
    damping: 30,
  },
  soft: {
    type: "spring" as const,
    stiffness: 260,
    damping: 24,
  },
  gentle: {
    type: "spring" as const,
    stiffness: 180,
    damping: 22,
  },
};

export const easeOutTransition = {
  duration: 0.35,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

/**
 * Container variants for staggered child entrances
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 280,
      damping: 24,
    },
  },
};

/**
 * Fade and Micro-Slide Variants
 */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 26,
    },
  },
};

/**
 * Modal & Drawer Variants
 */
export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: "easeIn" } },
};

export const modalPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 340,
      damping: 28,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: {
      duration: 0.18,
      ease: "easeIn",
    },
  },
};

/**
 * Chat Bubble Variants
 */
export const chatBubbleVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 320,
      damping: 26,
    },
  },
};
