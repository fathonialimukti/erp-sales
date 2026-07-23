import type { Transition, Variants } from "motion/react";

/**
 * Professional motion presets — single source of truth.
 * Prefer opacity + translateY. Always pair with useReducedMotion().
 */

export const durations = {
  /** Page enter (~240ms) */
  page: 0.24,
  /** Shell chrome (sidebar, subtle fades) */
  shell: 0.2,
  /** Stagger children / KPI items */
  item: 0.22,
} as const;

/** ease-out cubic — snappy settle, no overshoot */
export const easings = {
  out: [0.16, 1, 0.3, 1] as const,
} as const;

const easeOutTransition = (duration: number): Transition => ({
  duration,
  ease: easings.out,
});

/** Opacity-only fade (shell, light containers). */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: easeOutTransition(durations.shell),
  },
};

/** Page enter: fade + 8px y, ~240ms ease-out. */
export const pageEnter: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: easeOutTransition(durations.page),
  },
};

/** Parent for KPI/list stagger — 45ms, pair with StaggerItem (cap ~8 children). */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.04,
    },
  },
};

/** Child of staggerContainer — same enter language as pageEnter. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: easeOutTransition(durations.item),
  },
};

/**
 * Pattern with useReducedMotion():
 * ```tsx
 * const reduced = useReducedMotion();
 * <motion.div variants={pageEnter} {...getMotionProps(reduced)} />
 * ```
 * When reduced: skip enter animation (initial=false).
 */
export const getMotionProps = (reduced: boolean | null) =>
  reduced
    ? ({ initial: false, animate: "visible" as const } as const)
    : ({ initial: "hidden" as const, animate: "visible" as const } as const);
