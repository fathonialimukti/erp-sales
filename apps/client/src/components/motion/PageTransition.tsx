import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useLocation } from "react-router";

import { getMotionProps, pageEnter } from "@/lib/motion";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/** Wraps route outlet content with pageEnter; remounts on pathname change. */
export const PageTransition = ({ children, className }: PageTransitionProps) => {
  const { pathname } = useLocation();
  const reduced = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      className={className}
      variants={pageEnter}
      {...getMotionProps(reduced)}
    >
      {children}
    </motion.div>
  );
};
