import type { ReactNode } from "react";

import { FieldError } from "./FieldError";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  children: ReactNode;
  label?: ReactNode;
  description?: ReactNode;
  error?: string;
  isRequired?: boolean;
  className?: string;
  id?: string;
}

export const FormField = ({
  children,
  label,
  description,
  error,
  isRequired,
  className,
  id,
}: FormFieldProps) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    {label ? (
      <Label htmlFor={id} className="font-semibold">
        {label}
        {isRequired ? <span aria-hidden="true" className="text-destructive">*</span> : null}
      </Label>
    ) : null}
    {children}
    {description && !error ? (
      <p className="text-xs font-semibold text-muted-foreground">{description}</p>
    ) : null}
    {error ? <FieldError>{error}</FieldError> : null}
  </div>
);
