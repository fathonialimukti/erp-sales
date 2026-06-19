import type { CSSProperties } from "react";
import "./Skeleton.css";

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export const Skeleton = ({ className, style }: SkeletonProps) => (
  <span aria-hidden className={`skel ${className ?? ""}`} style={style} />
);
