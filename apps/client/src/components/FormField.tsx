import type { ReactNode } from "react";

import { CheckCircle2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { pageEnter } from "@/lib/motion";
import { FieldError } from "./FieldError";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  children: ReactNode;
  label?: ReactNode;
  description?: ReactNode;
  hint?: string;
  error?: string;
  isRequired?: boolean;
  showValid?: boolean;
  className?: string;
  id?: string;
}

export const FormField = ({
  children,
  label,
  description,
  hint,
  error,
  isRequired,
  showValid,
  className,
  id,
}: FormFieldProps) => {
  const reduced = useReducedMotion();

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <Label htmlFor={id} className="font-semibold">
          {label}
          {isRequired ? <span aria-hidden="true" className="text-destructive">*</span> : null}
          {showValid && !error ? (
            <motion.span
              variants={pageEnter}
              initial={reduced ? false : "hidden"}
              animate="visible"
              className="ml-1 inline-flex"
              aria-hidden="true"
            >
              <CheckCircle2 className="size-3.5 text-success" />
            </motion.span>
          ) : null}
        </Label>
      ) : null}
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {description && !error ? (
        <p className="text-xs font-semibold text-muted-foreground">{description}</p>
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
};
