import type { LabelHTMLAttributes, ReactNode } from "react";
import { Label as ShadLabel } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  required?: boolean;
}

export const Label = ({ children, required, className, ...rest }: LabelProps) => (
  <ShadLabel className={cn(className)} {...rest}>
    {children}
    {required ? <span className="text-destructive">*</span> : null}
  </ShadLabel>
);
