import type { HTMLAttributes } from "react";
import "./Separator.css";

interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export const Separator = ({ orientation = "horizontal", className, ...rest }: SeparatorProps) => (
  <div
    role="separator"
    aria-orientation={orientation}
    className={`sep sep--${orientation} ${className ?? ""}`}
    {...rest}
  />
);
