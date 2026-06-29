import type { CSSProperties } from "react";
import { icons } from "../../assets/icons";

export type ActivityLogIconName =
  | "back"
  | "search"
  | "close"
  | "chevron-right"
  | "eye"
  | "clipboard"
  | "clock"
  | "user";

interface ActivityLogIconProps {
  name: ActivityLogIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

const ICON_MAP: Record<ActivityLogIconName, string> = {
  back: icons.actionBack,
  search: icons.actionSearch,
  close: icons.actionClose,
  "chevron-right": icons.actionChevronRight,
  eye: icons.actionEye,
  clipboard: icons.activityClipboard,
  clock: icons.activityClock,
  user: icons.activityUser,
};

export const ActivityLogIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: ActivityLogIconProps) => (
  <img
    src={ICON_MAP[name]}
    alt={label ?? ""}
    width={size}
    height={size}
    aria-hidden={hidden ?? !label}
    aria-label={label}
    className={className}
    style={style}
  />
);
