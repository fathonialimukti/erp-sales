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
}: FormFieldProps) => (
  <div className={cn("flex flex-col gap-1.5", className)}>
    {label ? (
      <Label>
        {label}
        {isRequired ? <span className="text-destructive">*</span> : null}
      </Label>
    ) : null}
    {children}
    {description && !error ? (
      <p className="text-xs text-muted-foreground">{description}</p>
    ) : null}
    {error ? <FieldError>{error}</FieldError> : null}
  </div>
);
