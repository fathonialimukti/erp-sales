import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

interface FieldErrorProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export const FieldError = ({ children, className, ...rest }: FieldErrorProps) =>
  children ? (
    <p className={cn("text-xs text-state-danger", className)} role="alert" {...rest}>
      {children}
    </p>
  ) : null;
