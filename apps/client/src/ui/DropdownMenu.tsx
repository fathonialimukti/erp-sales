import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const DropdownMenu = ({ children, className, ...rest }: DropdownMenuProps) => (
  <div
    role="menu"
    className={cn(
      "min-w-[11rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);
