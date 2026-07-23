import type { CSSProperties } from "react";
import { Skeleton as ShadSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export const Skeleton = ({ className, style }: SkeletonProps) => (
  <ShadSkeleton aria-hidden className={cn("block h-4 w-full", className)} style={style} />
);
