import type { ReactNode } from "react";
import {
  Tooltip as ShadTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Tooltip = ({ content, children, className }: TooltipProps) => (
  <ShadTooltip>
    <TooltipTrigger asChild>
      <span className={className}>{children}</span>
    </TooltipTrigger>
    <TooltipContent>{content}</TooltipContent>
  </ShadTooltip>
);
