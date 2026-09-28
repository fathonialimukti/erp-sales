import type { CSSProperties } from "react";
import { DomainIcon, type DomainIconName } from "../../components/DomainIcon";

export type ActivityLogIconName =
  | "back"
  | "search"
  | "close"
  | "chevron-right"
  | "eye"
  | "clipboard"
  | "clock"
  | "user";

const ACTIVITY_LOG_ICON_MAP: Record<ActivityLogIconName, DomainIconName> = {
  back: "actionBack",
  search: "actionSearch",
  close: "actionClose",
  "chevron-right": "actionChevronRight",
  eye: "actionEye",
  clipboard: "activityClipboard",
  clock: "activityClock",
  user: "activityUser",
};

interface ActivityLogIconProps {
  name: ActivityLogIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

/** Re-export shim over shared DomainIcon — keeps existing imports working. */
export const ActivityLogIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: ActivityLogIconProps) => (
  <DomainIcon
    name={ACTIVITY_LOG_ICON_MAP[name]}
    size={size}
    className={className}
    style={style}
    aria-hidden={hidden}
    aria-label={label}
  />
);
