import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  /** Accessible name; omit when the mark is decorative. */
  label?: string;
}

/**
 * B2B CRM brand mark — "Twin Cards": two overlapping business cards, one
 * Azure and one Amber, joined by a shared connection node. Colors ride the
 * theme tokens so light/dark stay on-law; geometry mirrors the master
 * artwork in `src/assets/brand/mark.svg`.
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
      <g transform="rotate(-9 25 32)">
        <rect x="11" y="15" width="28" height="34" rx="9" fill="var(--primary-foreground)" />
      </g>
      <g transform="rotate(9 39 32)">
        <rect x="25" y="15" width="28" height="34" rx="9" fill="var(--warning)" />
      </g>
      <circle
        cx="32"
        cy="32"
        r="6.5"
        fill="var(--primary)"
        stroke="var(--primary-foreground)"
        strokeWidth="2.5"
      />
    </svg>
  );
}