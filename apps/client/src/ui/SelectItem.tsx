import type { ReactNode } from "react";
import { cn } from "./cn";

interface SelectItemProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
}

/**
 * Plain <option> wrapper. We render the native <select> in
 * `ui/Select`, so all items just become <option> children.
 */
export const SelectItem = ({ children }: SelectItemProps) => <>{children}</>;
