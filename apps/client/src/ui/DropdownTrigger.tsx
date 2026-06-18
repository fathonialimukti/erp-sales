import type { ReactNode } from "react";
import { cn } from "./cn";

interface DropdownTriggerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Marker component for the element that opens a Dropdown. In our
 * native <details>-based Dropdown, the trigger is the <summary>
 * element — `DropdownTrigger` is just a styled <span> wrapper that
 * page authors can use for symmetry with the HeroUI compound API.
 */
export const DropdownTrigger = ({ children, className }: DropdownTriggerProps) => (
  <span className={cn("inline-flex cursor-pointer", className)}>{children}</span>
);
