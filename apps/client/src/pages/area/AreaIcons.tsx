import type { CSSProperties } from "react";
import { DomainIcon, type DomainIconName } from "../../components/DomainIcon";
import { moduleCssVar } from "../../types/module";

/** Module plate wash helper — `var(--module-*)` only, no hex (design law §2). */
const areaAccent = (module: string) => {
  const accent = moduleCssVar(module);
  return accent ? ({ "--m-accent": accent, "--m-accent-end": accent } as CSSProperties) : undefined;
};

export { areaAccent };

export type AreaIconName =
  | "back"
  | "edit"
  | "delete"
  | "plus"
  | "search"
  | "check"
  | "close"
  | "chevron-right"
  | "chevron-down"
  | "chevron-left"
  | "menu-dots"
  | "eye"
  | "grid"
  | "outlet"
  | "region";

const AREA_ICON_MAP: Record<AreaIconName, DomainIconName> = {
  back: "actionBack",
  edit: "actionEdit",
  delete: "actionDelete",
  plus: "actionPlus",
  search: "actionSearch",
  check: "actionCheck",
  close: "actionClose",
  "chevron-right": "actionChevronRight",
  "chevron-down": "actionChevronDown",
  "chevron-left": "actionChevronLeft",
  "menu-dots": "actionMenuDots",
  eye: "actionEye",
  grid: "areaGrid",
  outlet: "areaOutlet",
  region: "areaRegion",
};

interface AreaIconProps {
  name: AreaIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

/** Re-export shim over shared DomainIcon — keeps existing imports working. */
export const AreaIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: AreaIconProps) => (
  <DomainIcon
    name={AREA_ICON_MAP[name]}
    size={size}
    className={className}
    style={style}
    aria-hidden={hidden}
    aria-label={label}
  />
);
