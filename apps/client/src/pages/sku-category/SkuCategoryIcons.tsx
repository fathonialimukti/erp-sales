import type { CSSProperties } from "react";
import { icons } from "../../assets/icons";

export type SkuCategoryIconName =
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
  | "category"
  | "sku"
  | "tag";

interface SkuCategoryIconProps {
  name: SkuCategoryIconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

const ICON_MAP: Record<SkuCategoryIconName, string> = {
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
  category: icons.skuCategoryTag,
  sku: icons.skuCategoryBox,
  tag: icons.skuCategoryTag,
};

export const SkuCategoryIcon = ({
  name,
  size = 18,
  className,
  style,
  "aria-hidden": hidden,
  "aria-label": label,
}: SkuCategoryIconProps) => (
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
