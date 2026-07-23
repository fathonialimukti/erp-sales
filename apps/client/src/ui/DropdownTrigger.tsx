import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DropdownTriggerProps {
  children: ReactNode;
  className?: string;
}

export const DropdownTrigger = ({ children, className }: DropdownTriggerProps) => (
  <span className={cn("inline-flex", className)}>{children}</span>
);
