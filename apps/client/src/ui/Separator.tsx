import type { HTMLAttributes } from "react";
import { cn } from "./cn";

interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export const Separator = ({ orientation = "horizontal", className, ...rest }: SeparatorProps) => (
  <div
    role="separator"
    aria-orientation={orientation}
    className={cn(
      orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
      "bg-slate-200 dark:bg-slate-800",
      className,
    )}
    {...rest}
  />
);
