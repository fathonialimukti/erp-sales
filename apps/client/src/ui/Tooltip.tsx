import type { ReactNode } from "react";
import { cn } from "./cn";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Minimal CSS-only tooltip built on `:hover` and `::after`. Sufficient
 * for the foundation phase; can be promoted to a Radix/Floating-UI
 * tooltip later if more sophisticated behaviour is needed.
 */
export const Tooltip = ({ content, children, className }: TooltipProps) => (
  <span className={cn("group relative inline-flex", className)}>
    {children}
    <span
      role="tooltip"
      className={cn(
        "pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md",
        "border border-slate-200 bg-slate-900 px-2 py-1 text-xs text-slate-50 opacity-0 shadow-md transition-opacity",
        "group-hover:opacity-100",
        "dark:border-slate-700",
      )}
    >
      {content}
    </span>
  </span>
);
