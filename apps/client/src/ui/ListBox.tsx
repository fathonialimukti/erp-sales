import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

interface ListBoxProps extends HTMLAttributes<HTMLUListElement> {
  children: ReactNode;
}

export const ListBox = ({ children, className, ...rest }: ListBoxProps) => (
  <ul
    role="listbox"
    className={cn("flex flex-col gap-0.5 outline-none", className)}
    {...rest}
  >
    {children}
  </ul>
);
