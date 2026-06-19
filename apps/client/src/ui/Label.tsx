import type { LabelHTMLAttributes, ReactNode } from "react";
import "./Label.css";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  required?: boolean;
}

export const Label = ({ children, required, className, ...rest }: LabelProps) => (
  <label className={`lbl ${className ?? ""}`} {...rest}>
    {children}
    {required && <span className="lbl__required">*</span>}
  </label>
);
