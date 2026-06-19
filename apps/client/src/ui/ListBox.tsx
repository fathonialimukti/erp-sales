import type { HTMLAttributes, ReactNode } from "react";
import "./ListBox.css";

interface ListBoxProps extends HTMLAttributes<HTMLUListElement> {
  children: ReactNode;
}

export const ListBox = ({ children, className, ...rest }: ListBoxProps) => (
  <ul role="listbox" className={`lb ${className ?? ""}`} {...rest}>
    {children}
  </ul>
);
