import type { HTMLAttributes, ReactNode } from "react";

interface DropdownMenuProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const DropdownMenu = ({ children, className, ...rest }: DropdownMenuProps) => (
  <div role="menu" className={`dd__panel dd__panel--bottom dd__panel--end ${className ?? ""}`} {...rest}>
    {children}
  </div>
);
