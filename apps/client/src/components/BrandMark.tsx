import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  /** Accessible name; omit when the mark is decorative. */
  label?: string;
}

/**
 * ERP Sales brand mark — "Territory Route": a route-drawn E with waypoint
 * dots over a territory grid, on an Aurora Azure tile. Colors ride the theme
 * tokens so light/dark stay on-law; geometry mirrors the master artwork in
 * `src/assets/brand/mark.svg`.
 */
export function BrandMark({ className, label }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("shrink-0", className)}
    >
      <rect width="64" height="64" rx="14" fill="var(--primary)" />
      <path
        d="M21.33 0 V64 M42.66 0 V64 M0 21.33 H64 M0 42.66 H64"
        stroke="var(--primary-foreground)"
        strokeOpacity="0.28"
        strokeWidth="1.3"
        fill="none"
      />
      <path
        d="M42 15 H18 V49 H42 M18 32 H34"
        stroke="var(--primary-foreground)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <polygon
        points="36,28 44,32 36,36"
        fill="var(--primary-foreground)"
      />
      <circle cx="49.5" cy="15" r="3.4" fill="var(--primary-foreground)" />
      <circle cx="49.5" cy="49" r="3.4" fill="var(--primary-foreground)" />
      <circle cx="49.5" cy="32" r="3.4" fill="var(--primary-foreground)" />
    </svg>
  );
}
