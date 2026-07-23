import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FieldErrorProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export const FieldError = ({ children, className, ...rest }: FieldErrorProps) =>
  children ? (
    <p className={cn("text-xs text-destructive", className)} role="alert" {...rest}>
      {children}
    </p>
  ) : null;
