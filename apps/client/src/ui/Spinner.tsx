import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const SIZE_CLASS = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
} as const;

export const Spinner = ({ size = "md", className, label }: SpinnerProps) => (
  <span
    role="status"
    aria-label={label ?? "Loading"}
    className={cn("inline-flex items-center justify-center", className)}
  >
    <Loader2 className={cn("animate-spin text-primary", SIZE_CLASS[size])} aria-hidden />
  </span>
);
