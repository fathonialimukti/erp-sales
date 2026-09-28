import type { CSSProperties } from "react";
import { DomainIcon } from "../../components/DomainIcon";

/* User keeps inline-SVG domain glyphs (no asset keys);
 * the shared action set delegates to DomainIcon. */

export type UserIconName =
  | "back"
  | "edit"
  | "delete"
  | "plus"
  | "search"
  | "check"
  | "close"
  | "chevron-right"
  | "eye"
  | "user"
  | "mail"
  | "phone"
  | "shield"
  | "key"
  | "calendar";

interface UserIconProps {
  name: UserIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

type SharedAction = "back" | "edit" | "delete" | "plus" | "search" | "check" | "close" | "chevron-right" | "eye";

const SHARED_ACTIONS: Record<SharedAction, "actionBack" | "actionEdit" | "actionDelete" | "actionPlus" | "actionSearch" | "actionCheck" | "actionClose" | "actionChevronRight" | "actionEye"> = {
  back: "actionBack",
  edit: "actionEdit",
  delete: "actionDelete",
  plus: "actionPlus",
  search: "actionSearch",
  check: "actionCheck",
  close: "actionClose",
  "chevron-right": "actionChevronRight",
  eye: "actionEye",
};

const isSharedAction = (name: UserIconName): name is SharedAction =>
  name in SHARED_ACTIONS;

const INLINE_SVGS: Record<string, string> = {
  user: `<svg xmlns="http://www.w3.org/2000/svg" width="SIZE" height="SIZE" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  mail: `<svg xmlns="http://www.w3.org/2000/svg" width="SIZE" height="SIZE" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  phone: `<svg xmlns="http://www.w3.org/2000/svg" width="SIZE" height="SIZE" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  shield: `<svg xmlns="http://www.w3.org/2000/svg" width="SIZE" height="SIZE" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>`,
  key: `<svg xmlns="http://www.w3.org/2000/svg" width="SIZE" height="SIZE" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 7.5 8.5 14.5"/><path d="M14 5.5a3.5 3.5 0 0 0-4.95 4.95L4 15.5V20h4.5l5.05-5.05a3.5 3.5 0 0 0 4.95-4.95l-1.78 1.78-2.61-.52-.52-2.61z"/></svg>`,
  calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="SIZE" height="SIZE" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
};

export const UserIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: UserIconProps) => {
  if (isSharedAction(name)) {
    return (
      <DomainIcon
        name={SHARED_ACTIONS[name]}
        size={size}
        className={className}
        style={style}
        aria-hidden={hidden}
        aria-label={label}
      />
    );
  }
  const svg = INLINE_SVGS[name]?.replace(/SIZE/g, String(size));
  if (!svg) return null;
  return (
    <span
      className={className}
      style={{ display: "inline-flex", width: size, height: size, ...style }}
      aria-hidden={hidden ?? !label}
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
