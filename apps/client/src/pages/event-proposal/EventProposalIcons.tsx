import type { CSSProperties } from "react";
import { DomainIcon, type DomainIconName } from "../../components/DomainIcon";

export type EventProposalIconName =
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
  | "document"
  | "calendar"
  | "budget"
  | "payment"
  | "sparkle";

const EVENT_PROPOSAL_ICON_MAP: Record<EventProposalIconName, DomainIconName> = {
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
  document: "eventProposalDocument",
  calendar: "eventProposalCalendar",
  budget: "eventProposalBudget",
  payment: "eventProposalBudget",
  sparkle: "dashSparkle",
};

interface EventProposalIconProps {
  name: EventProposalIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

/** Re-export shim over shared DomainIcon — keeps existing imports working. */
export const EventProposalIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: EventProposalIconProps) => (
  <DomainIcon
    name={EVENT_PROPOSAL_ICON_MAP[name]}
    size={size}
    className={className}
    style={style}
    aria-hidden={hidden}
    aria-label={label}
  />
);
