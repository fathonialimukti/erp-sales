import type { ReactNode } from "react";
import { Label } from "./Label";
import { FieldError } from "./FieldError";
import "./FormField.css";

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
  <div className={`ff ${className ?? ""}`}>
    {label && <Label required={isRequired}>{label}</Label>}
    {children}
    {description && !error && <p className="ff__desc">{description}</p>}
    {error && <FieldError>{error}</FieldError>}
  </div>
);
