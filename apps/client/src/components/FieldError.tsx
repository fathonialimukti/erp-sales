import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FieldErrorProps {
  children: ReactNode;
  className?: string;
}

export const FieldError = ({ children, className }: FieldErrorProps) => (
  <p
    className={cn("text-xs font-semibold text-destructive", className)}
    aria-live="polite"
    role="alert"
  >
    {children}
  </p>
);
