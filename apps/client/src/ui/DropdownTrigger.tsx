import type { ReactNode } from "react";

interface DropdownTriggerProps {
  children: ReactNode;
  className?: string;
}

export const DropdownTrigger = ({ children, className }: DropdownTriggerProps) => (
  <span className={`dd__trigger ${className ?? ""}`}>{children}</span>
);
