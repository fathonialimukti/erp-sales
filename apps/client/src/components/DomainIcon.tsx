import type { CSSProperties } from "react";
import { icons } from "../assets/icons";

/**
 * DomainIcon — shared replacement for the 14 per-page `*Icons.tsx` files.
 *
 * Chrome icons are Lucide (law §5); these module plates cover nav/domain
 * wayfinding only, rendered from the bundled `src/assets/icons` map.
 * Hex is banned in new JSX — `accent` uses `var(--module-*)` only.
 */

export type DomainIconName = keyof typeof icons;

interface DomainIconProps {
  name: DomainIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  /** Module key for the icon plate wash, e.g. "customer" → var(--module-customer). */
  module?: string;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

const toModuleVar = (module?: string): string | undefined => {
  if (!module) return undefined;
  const cssKey = module.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  return `var(--module-${cssKey})`;
};

export const DomainIcon = ({
  name,
  size = 18,
  className,
  style,
  module,
  "aria-hidden": hidden,
  "aria-label": label,
}: DomainIconProps) => {
  const accent = toModuleVar(module);
  return (
    <img
      src={icons[name]}
      alt={label ?? ""}
      width={size}
      height={size}
      aria-hidden={hidden ?? !label}
      aria-label={label}
      className={className}
      style={accent ? ({ ...style, "--m-accent": accent } as CSSProperties) : style}
    />
  );
};
