import type { ReactNode } from "react";

interface SelectItemProps {
  value?: string;
  children: ReactNode;
  disabled?: boolean;
}

export const SelectItem = ({ children }: SelectItemProps) => <>{children}</>;
