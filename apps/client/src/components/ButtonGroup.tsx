import type { ReactNode } from "react";
import "./ButtonGroup.css";

/* ============================================================
 * ButtonGroup — iOS Settings-style button row.
 *
 * Used to consolidate a row of related actions (back / view / edit /
 * delete / print) at the top of a page header. Each button is a
 * compact pill with an icon + label, separated by hairline
 * dividers (iOS pattern). Buttons can be rendered as either
 * <button> (action) or <a> (link) depending on the use case.
 *
 * Variants:
 *   - "default"   — neutral / outline buttons
 *   - "danger"    — danger buttons (rendered red on hover)
 *
 * Buttons stretch to fit the container on mobile.
 * ============================================================ */

export type ButtonGroupItem =
  | {
      key: string;
      label: string;
      icon: ReactNode;
      onClick: () => void;
      variant?: "default" | "danger" | "primary" | "success" | "warning";
      disabled?: boolean;
      isLoading?: boolean;
      type?: "button" | "submit";
      "aria-label"?: string;
    }
  | {
      key: string;
      label: string;
      icon: ReactNode;
      to: string;
      variant?: "default" | "danger" | "primary" | "success" | "warning";
      disabled?: boolean;
      isLoading?: boolean;
      "aria-label"?: string;
    };

interface ButtonGroupProps {
  /** Action items in render order (left-to-right). */
  items: ButtonGroupItem[];
  /** Size variant — defaults to "md". */
  size?: "sm" | "md";
  /** Optional className passthrough. */
  className?: string;
}

export const ButtonGroup = ({
  items,
  size = "md",
  className,
}: ButtonGroupProps) => {
  if (items.length === 0) return null;

  return (
    <div
      className={[
        "bgrp",
        `bgrp--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="toolbar"
      aria-orientation="horizontal"
    >
      {items.map((item, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === items.length - 1;
        const variant = item.variant ?? "default";
        const variantClass =
          variant === "danger"
            ? "bgrp__btn--danger"
            : variant === "primary"
            ? "bgrp__btn--primary"
            : variant === "success"
            ? "bgrp__btn--success"
            : variant === "warning"
            ? "bgrp__btn--warning"
            : "";
        const disabledClass = item.disabled ? "bgrp__btn--disabled" : "";

        const inner = (
          <>
            {!isFirst && <span className="bgrp__divider" aria-hidden="true" />}
            <span className="bgrp__btn-inner">
              <span className="bgrp__btn-icon" aria-hidden="true">
                {item.isLoading ? (
                  <span className="bgrp__btn-spinner" />
                ) : (
                  item.icon
                )}
              </span>
              <span className="bgrp__btn-label">{item.label}</span>
            </span>
          </>
        );

        // Render <a> if `to` is provided (navigation), otherwise <button>
        if ("to" in item && item.to) {
          return (
            <a
              key={item.key}
              href={item.to}
              className={`bgrp__btn ${variantClass} ${disabledClass}`.trim()}
              aria-disabled={item.disabled || undefined}
              aria-label={item["aria-label"] ?? item.label}
              onClick={(e) => {
                if (item.disabled) {
                  e.preventDefault();
                  return;
                }
                // Allow normal anchor navigation
              }}
            >
              {inner}
            </a>
          );
        }

        const btnItem = item as Extract<
          ButtonGroupItem,
          { onClick: () => void }
        >;
        return (
          <button
            key={item.key}
            type={btnItem.type ?? "button"}
            className={`bgrp__btn ${variantClass} ${disabledClass}`.trim()}
            onClick={btnItem.onClick}
            disabled={btnItem.disabled || btnItem.isLoading}
            aria-label={btnItem["aria-label"] ?? btnItem.label}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
};
