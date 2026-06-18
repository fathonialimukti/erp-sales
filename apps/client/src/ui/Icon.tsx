import { memo } from "react";
import { Icon as RawIcon } from "./";

interface IconProps {
  icon: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

/**
 * Thin wrapper around @iconify/react Icon that:
 * 1. Memoizes by `icon` prop so React 19 re-renders don't trigger iconify's
 *    internal JSON.stringify state comparison (which can throw
 *    "Converting circular structure to JSON" when many icons are present).
 * 2. Skips re-renders when props are unchanged.
 */
const IconBase = ({ icon, ...rest }: IconProps) => <RawIcon icon={icon} {...rest} />;

export const Icon = memo(IconBase, (prev, next) => prev.icon === next.icon && prev.className === next.className);
Icon.displayName = "Icon";
