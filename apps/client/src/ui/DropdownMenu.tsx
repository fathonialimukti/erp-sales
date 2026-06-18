import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

interface DropdownMenuProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Marker component for the menu list inside a Dropdown. Our native
 * primitive renders the items inside a <div role="menu">; this
 * compound keeps the HeroUI-like call-site symmetry.
 */
export const DropdownMenu = ({ children, className, ...rest }: DropdownMenuProps) => (
  <div role="menu" className={cn("flex flex-col", className)} {...rest}>
    {children}
  </div>
);
