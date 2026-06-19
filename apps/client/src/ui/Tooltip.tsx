import type { ReactNode } from "react";
import "./Tooltip.css";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Tooltip = ({ content, children, className }: TooltipProps) => (
  <span className={`tip ${className ?? ""}`}>
    {children}
    <span role="tooltip" className="tip__content">
      {content}
    </span>
  </span>
);
