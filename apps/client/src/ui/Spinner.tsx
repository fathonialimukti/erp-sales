import { cn } from "./cn";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const SIZE = { sm: "h-4 w-4 border-2", md: "h-6 w-6 border-2", lg: "h-9 w-9 border-[3px]" };

export const Spinner = ({ size = "md", className, label }: SpinnerProps) => (
  <span role="status" aria-label={label ?? "Loading"} className={cn("inline-block", className)}>
    <span
      className={cn(
        "block animate-spin rounded-full border-current border-t-transparent text-accent-500",
        SIZE[size],
      )}
    />
  </span>
);
