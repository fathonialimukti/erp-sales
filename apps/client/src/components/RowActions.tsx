import type { ReactNode } from "react";
import { Dropdown, DropdownItem, DropdownSeparator } from "../ui/Dropdown";
import "./RowActions.css";

/* ============================================================
 * RowActions — icon-only dropdown for table row actions.
 *
 * Renders a single menu-dots trigger button that opens a dropdown
 * panel. Designed to replace ad-hoc action button clusters in
 * index tables (view / edit / print / delete, etc.).
 *
 * Why icon-only?
 *   - Saves horizontal space in dense tables
 *   - Keeps the action column narrow and consistent
 *   - The dropdown panel carries the labels
 *
 * Placement: left-aligned by default (the panel opens from the
 * trigger's left edge) so it stays inside the table on the right
 * edge of the viewport.
 * ============================================================ */

export interface RowActionItem {
  /** Stable key. */
  key: string;
  /** Visible label in the dropdown panel. */
  label: string;
  /** Leading icon (any ReactNode — typically an SVG icon). */
  icon?: ReactNode;
  /** Click handler. */
  onClick?: () => void;
  /** Visual tone — "danger" renders red. */
  tone?: "default" | "danger";
  /** Render a separator above this item. */
  separator?: boolean;
  /** Disable the item. */
  disabled?: boolean;
}

interface RowActionsProps {
  /** Menu items in render order. */
  items: RowActionItem[];
  /** Accessible label for the trigger button. */
  ariaLabel?: string;
  /** Icon for the trigger button — defaults to a vertical dots glyph. */
  triggerIcon?: ReactNode;
  /** Dropdown panel alignment — "start" (left) or "end" (right). */
  align?: "start" | "end";
  /** Size variant — "sm" for compact tables, "md" default. */
  size?: "sm" | "md";
}

const DefaultTriggerIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <circle cx="12" cy="5" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="12" cy="19" r="1.5" />
  </svg>
);

export const RowActions = ({
  items,
  ariaLabel = "Actions",
  triggerIcon,
  align = "start",
  size = "md",
}: RowActionsProps) => {
  if (items.length === 0) return null;

  return (
    <div className={`row-actions row-actions--${size}`}>
      <Dropdown
        align={align}
        trigger={
          <button
            type="button"
            className="row-actions__trigger"
            aria-label={ariaLabel}
          >
            {triggerIcon ?? DefaultTriggerIcon}
          </button>
        }
      >
        {items.map((item) => (
          <div key={item.key} className="row-actions__item-wrap">
            {item.separator && <DropdownSeparator />}
            <DropdownItem
              tone={item.tone}
              leftIcon={item.icon}
              disabled={item.disabled}
              onClick={item.onClick}
            >
              {item.label}
            </DropdownItem>
          </div>
        ))}
      </Dropdown>
    </div>
  );
};
