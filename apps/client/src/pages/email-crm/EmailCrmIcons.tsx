import type { CSSProperties } from "react";
import { DomainIcon, type DomainIconName } from "../../components/DomainIcon";

export type EmailCrmIconName =
  | "back"
  | "edit"
  | "delete"
  | "plus"
  | "search"
  | "check"
  | "close"
  | "chevron-right"
  | "menu-dots"
  | "eye"
  | "inbox"
  | "sparkle"
  | "user"
  | "clock";

const EMAIL_CRM_ICON_MAP: Record<EmailCrmIconName, DomainIconName> = {
  back: "actionBack",
  edit: "actionEdit",
  delete: "actionDelete",
  plus: "actionPlus",
  search: "actionSearch",
  check: "actionCheck",
  close: "actionClose",
  "chevron-right": "actionChevronRight",
  "menu-dots": "actionMenuDots",
  eye: "actionEye",
  inbox: "dashInbox",
  sparkle: "dashSparkle",
  user: "customerUser",
  clock: "uiClock",
};

interface EmailCrmIconProps {
  name: EmailCrmIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

/** Re-export shim over shared DomainIcon — keeps existing imports working. */
export const EmailCrmIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: EmailCrmIconProps) => (
  <DomainIcon
    name={EMAIL_CRM_ICON_MAP[name]}
    size={size}
    className={className}
    style={style}
    aria-hidden={hidden}
    aria-label={label}
  />
);
