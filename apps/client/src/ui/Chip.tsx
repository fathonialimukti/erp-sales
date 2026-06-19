import type { HTMLAttributes, ReactNode } from "react";
import "./Chip.css";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: "sm" | "md";
  children: ReactNode;
}

export const Chip = ({ tone = "neutral", size = "sm", className, children, ...rest }: ChipProps) => (
  <span className={`chip chip--${tone} chip--${size} ${className ?? ""}`} {...rest}>
    {children}
  </span>
);
