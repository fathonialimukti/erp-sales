import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  required?: boolean;
}

export const Label = ({ children, required, className, ...rest }: LabelProps) => (
  <label
    className={cn("text-sm font-medium text-slate-700 dark:text-slate-300", className)}
    {...rest}
  >
    {children}
    {required && <span className="ml-0.5 text-state-danger">*</span>}
  </label>
);
