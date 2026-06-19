import type { HTMLAttributes, ReactNode } from "react";
import "./FieldError.css";

interface FieldErrorProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export const FieldError = ({ children, className, ...rest }: FieldErrorProps) =>
  children ? (
    <p className={`ferr ${className ?? ""}`} role="alert" {...rest}>
      {children}
    </p>
  ) : null;
