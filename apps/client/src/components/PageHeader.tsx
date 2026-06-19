import type { ReactNode } from "react";
import { useIntl } from "react-intl";
import { Icon } from "../ui";
import { Button } from "../ui/Button";
import "./PageHeader.css";

interface PageHeaderProps {
  title: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  onDetail?: () => void;
  isDisabled?: boolean;
  children?: ReactNode;
}

export const PageHeader = ({
  title,
  onEdit,
  onDelete,
  onBack,
  onDetail,
  isDisabled = false,
  children,
}: PageHeaderProps) => {
  const intl = useIntl();

  type Action = {
    key: string;
    label: string;
    icon: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  };

  const items: Action[] = (
    [
      onDetail
        ? {
            key: "detail",
            label: intl.formatMessage({ id: "action_detail", defaultMessage: "Detail" }),
            icon: "solar:info-circle-linear",
            onClick: onDetail,
            variant: "outline" as const,
          }
        : null,
      onEdit
        ? {
            key: "edit",
            label: intl.formatMessage({ id: "action_edit", defaultMessage: "Edit" }),
            icon: "solar:pen-linear",
            onClick: onEdit,
            variant: "outline" as const,
          }
        : null,
      onDelete
        ? {
            key: "delete",
            label: intl.formatMessage({ id: "action_delete", defaultMessage: "Delete" }),
            icon: "solar:trash-bin-trash-linear",
            onClick: onDelete,
            variant: "danger" as const,
          }
        : null,
      onBack
        ? {
            key: "back",
            label: intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" }),
            icon: "solar:alt-arrow-left-linear",
            onClick: onBack,
            variant: "ghost" as const,
          }
        : null,
    ] as (Action | null)[]
  ).filter((x): x is Action => x !== null);

  return (
    <div className="ph">
      <h1 className="ph__title">{title}</h1>
      <div className="ph__actions">
        {children}
        {items.map((action, idx) => (
          <div key={action.key} className="ph__action-item">
            {idx > 0 && <span className="ph__divider" />}
            <Button
              variant={action.variant ?? "outline"}
              onClick={action.onClick}
              disabled={isDisabled}
              leftIcon={<Icon icon={action.icon} />}
            >
              <span className="ph__action-label">{action.label}</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
