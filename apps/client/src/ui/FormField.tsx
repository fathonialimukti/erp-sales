import type { ReactNode } from "react";
import { Label } from "./Label";
import { FieldError } from "./FieldError";
import { cn } from "./cn";

interface FormFieldProps {
  children: ReactNode;
  label?: ReactNode;
  description?: ReactNode;
  error?: string;
  isRequired?: boolean;
  className?: string;
  /** Override the input id (for cases where the inner control already provides one). */
  id?: string;
}

/**
 * Label + control + error wrapper. The control is provided as children
 * and is responsible for its own value/onChange. Replaces HeroUI's
 * <TextField> which had a similar shape.
 */
export const FormField = ({
  children,
  label,
  description,
  error,
  isRequired,
  className,
}: FormFieldProps) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    {label && <Label required={isRequired}>{label}</Label>}
    {children}
    {description && !error && <p className="text-xs text-slate-500">{description}</p>}
    {error && <FieldError>{error}</FieldError>}
  </div>
);
