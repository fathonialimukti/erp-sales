import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

import { getMotionProps, staggerContainer, staggerItem } from "@/lib/motion";

interface StaggerProps {
  children: ReactNode;
  className?: string;
  /** Accessible name when used as a landmark region. */
  "aria-label"?: string;
}

/** Stagger parent — max ~8 children recommended. */
export const Stagger = ({
  children,
  className,
  "aria-label": ariaLabel,
}: StaggerProps) => {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      {...getMotionProps(reduced)}
      aria-label={ariaLabel}
    >
      {children}
    </motion.div>
  );
};

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

/** Stagger child — must live under Stagger (or a parent with staggerContainer). */
export const StaggerItem = ({ children, className }: StaggerItemProps) => (
  <motion.div className={className} variants={staggerItem}>
    {children}
  </motion.div>
);
