import type { CSSProperties } from "react";
import { icons } from "../../assets/icons";

const accent = { "--m-accent": "#3B82F6", "--m-accent-end": "#2563EB" } as React.CSSProperties;

export type SkuIconName =
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
  | "package"
  | "price";

interface SkuIconProps {
  name: SkuIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

const ICON_MAP: Record<SkuIconName, string> = {
  back: icons.actionBack,
  edit: icons.actionEdit,
  delete: icons.actionDelete,
  plus: icons.actionPlus,
  search: icons.actionSearch,
  check: icons.actionCheck,
  close: icons.actionClose,
  "chevron-right": icons.actionChevronRight,
  "menu-dots": icons.actionMenuDots,
  eye: icons.actionEye,
  package: icons.skuPackage,
  price: icons.skuPrice,
};

export const SkuIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: SkuIconProps) => (
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
