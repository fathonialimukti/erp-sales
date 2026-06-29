import type { ReactNode } from "react";
import { useIntl } from "react-intl";
import { Button, Icon } from "../ui";
import "./PageHeader.css";

/* ============================================================
 * PageHeader — reusable page header used at the top of every page.
 *
 * Visual structure (left to right):
 *   [Back button (optional)]
 *   [Heading column: kicker / title / subtitle]
 *   [Actions column (right-aligned): custom buttons + Edit + Delete]
 *
 * Usage:
 *   <PageHeader
 *     kicker="Master Data"
 *     title="Regions"
 *     subtitle="Geographic regions that group areas, outlets, and salesmen."
 *     onBack={() => navigate("/region")}
 *     primaryAction={{ label: "Add Region", icon: "solar:add-circle-linear", onClick: () => navigate("/region/create") }}
 *     onEdit={canUpdate ? () => navigate(`/region/${id}/edit`) : undefined}
 *     onDelete={canDelete ? () => setDeleteModalOpen(true) : undefined}
 *   />
 * ============================================================ */

export interface PageHeaderAction {
  /** Stable key for React reconciliation. */
  key: string;
  /** Button label (already translated by caller via intl.formatMessage). */
  label: string;
  /** Optional iconify string. */
  icon?: string;
  /** Click handler. */
  onClick: () => void;
  /** Button variant. Defaults to "outline". */
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  /** Disable the button. */
  disabled?: boolean;
  /** Optional loading state — shows a spinner instead of the icon. */
  isLoading?: boolean;
}

interface PageHeaderProps {
  /** Small uppercase label above the title (e.g. "Master Data"). */
  kicker?: string;
  /** Page title (h1). Required. */
  title: string;
  /** Optional subtitle/description below the title. */
  subtitle?: string;
  /** Optional back button — when set, a ghost button with arrow icon is rendered first. */
  onBack?: () => void;
  /** Optional list of action buttons (right side). Newest item renders rightmost. */
  actions?: PageHeaderAction[];
  /** Convenience: a single primary action (e.g. "Add Region"). Rendered first in the actions group. */
  primaryAction?: PageHeaderAction;
  /** Convenience: a danger action (e.g. "Delete"). Rendered last in the actions group. */
  dangerAction?: PageHeaderAction;
  /** Convenience: an edit action — shortcut for `actions=[{variant: "outline", icon: "solar:pen-linear", label: "Edit"}]`. */
  onEdit?: () => void;
  /** Edit button label override. */
  editLabel?: string;
  /** Convenience: a delete action. */
  onDelete?: () => void;
  /** Delete button label override. */
  deleteLabel?: string;
  /** Show icons in action buttons (default true). */
  showActionIcons?: boolean;
  /** Optional extra content (chips, breadcrumbs, etc.) rendered above the heading. */
  topSlot?: ReactNode;
  /** Optional extra content rendered below the heading. */
  bottomSlot?: ReactNode;
}

export const PageHeader = ({
  kicker,
  title,
  subtitle,
  onBack,
  actions,
  primaryAction,
  dangerAction,
  onEdit,
  editLabel,
  onDelete,
  deleteLabel,
  showActionIcons = true,
  topSlot,
  bottomSlot,
}: PageHeaderProps) => {
  const intl = useIntl();

  // Build the final action list: primary first, then custom, then danger/edit/delete.
  const computedActions: PageHeaderAction[] = [];
  if (primaryAction) computedActions.push(primaryAction);
  if (actions) computedActions.push(...actions);
  if (onEdit) {
    computedActions.push({
      key: "__edit",
      label: editLabel ?? intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }),
      icon: "solar:pen-linear",
      onClick: onEdit,
      variant: "outline",
    });
  }
  if (onDelete) {
    computedActions.push({
      key: "__delete",
      label: deleteLabel ?? intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }),
      icon: "solar:trash-bin-trash-linear",
      onClick: onDelete,
      variant: "danger",
    });
  } else if (dangerAction) {
    computedActions.push(dangerAction);
  }

  return (
    <header className="ph">
      {topSlot ? <div className="ph__top-slot">{topSlot}</div> : null}

      <div className="ph__row">
        {onBack && (
          <Button
            variant="ghost"
            onClick={onBack}
            aria-label={intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
            className="ph__back"
          >
            <Icon icon="solar:alt-arrow-left-linear" />
            <span className="ph__back-label">
              {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
            </span>
          </Button>
        )}

        <div className="ph__heading">
          {kicker ? <span className="ph__kicker">{kicker}</span> : null}
          <h1 className="ph__title">{title}</h1>
          {subtitle ? <p className="ph__subtitle">{subtitle}</p> : null}
        </div>

        {computedActions.length > 0 && (
          <div className="ph__actions">
            {computedActions.map((action, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === computedActions.length - 1;
              return (
                <div key={action.key} className="ph__action-item">
                  {!isFirst && <span className="ph__divider" aria-hidden="true" />}
                  {action.variant === "danger" && isLast ? (
                    <Button
                      variant="danger"
                      onClick={action.onClick}
                      disabled={action.disabled || action.isLoading}
                      leftIcon={
                        action.isLoading ? undefined : action.icon && showActionIcons ? (
                          <Icon icon={action.icon} />
                        ) : undefined
                      }
                    >
                      {action.label}
                    </Button>
                  ) : (
                    <Button
                      variant={action.variant ?? "outline"}
                      onClick={action.onClick}
                      disabled={action.disabled || action.isLoading}
                      leftIcon={
                        action.isLoading ? undefined : action.icon && showActionIcons ? (
                          <Icon icon={action.icon} />
                        ) : undefined
                      }
                    >
                      {action.label}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {bottomSlot ? <div className="ph__bottom-slot">{bottomSlot}</div> : null}
    </header>
  );
};
