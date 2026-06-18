import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: "sm" | "md";
  children: ReactNode;
}

const TONE: Record<Tone, string> = {
  neutral: "bg-state-neutral-bg text-state-neutral",
  success: "bg-state-success-bg text-state-success",
  warning: "bg-state-warning-bg text-state-warning",
  danger: "bg-state-danger-bg text-state-danger",
  info: "bg-state-info-bg text-state-info",
  accent: "bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300",
};

export const Chip = ({ tone = "neutral", size = "sm", className, children, ...rest }: ChipProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full font-medium",
      size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
      TONE[tone],
      className,
    )}
    {...rest}
  >
    {children}
  </span>
);
