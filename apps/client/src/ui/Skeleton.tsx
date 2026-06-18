import { cn } from "./cn";

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <span
    aria-hidden
    className={cn("block animate-pulse rounded-md bg-slate-200 dark:bg-slate-800", className)}
  />
);
