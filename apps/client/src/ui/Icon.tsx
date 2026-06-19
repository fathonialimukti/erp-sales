import { memo, type CSSProperties } from "react";
import { Icon as RawIcon } from "@iconify/react";

interface IconProps {
  icon: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

const IconBase = ({ icon, ...rest }: IconProps) => <RawIcon icon={icon} {...rest} />;

export const Icon = memo(IconBase, (prev, next) => prev.icon === next.icon && prev.className === next.className);
Icon.displayName = "Icon";
