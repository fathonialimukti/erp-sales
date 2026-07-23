import type { HTMLAttributes, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary" | "accent";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: "sm" | "md";
  children: ReactNode;
}

const TONE_CLASS: Record<Tone, string> = {
  neutral: "border-transparent bg-muted text-muted-foreground",
  success: "border-transparent bg-success/15 text-success",
  warning: "border-transparent bg-warning/15 text-warning",
  danger: "border-transparent bg-destructive/15 text-destructive",
  info: "border-transparent bg-info/15 text-info",
  primary: "border-transparent bg-primary/15 text-primary",
  accent: "border-transparent bg-accent text-accent-foreground",
};

export const Chip = ({
  tone = "neutral",
  size = "sm",
  className,
  children,
  ...rest
}: ChipProps) => (
  <Badge
    variant="secondary"
    className={cn(
      TONE_CLASS[tone],
      size === "md" && "px-2.5 py-1 text-sm",
      className,
    )}
    {...rest}
  >
    {children}
  </Badge>
);
