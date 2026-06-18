import type { ReactNode } from "react";
import { useIntl } from "react-intl";
import { Icon } from "../ui";
import { Button } from "../ui/Button";
import { cn } from "../ui/cn";

interface PageHeaderProps {
  title: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  onDetail?: () => void;
  isDisabled?: boolean;
  children?: ReactNode;
}

const divider = <span aria-hidden className="h-5 w-px bg-slate-200 dark:bg-slate-800" />;

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

  const items: Action[] = [
    onDetail && {
      key: "detail",
      label: intl.formatMessage({ id: "action_detail", defaultMessage: "Detail" }),
      icon: "solar:info-circle-linear",
      onClick: onDetail,
      variant: "outline",
    },
    onEdit && {
      key: "edit",
      label: intl.formatMessage({ id: "action_edit", defaultMessage: "Edit" }),
      icon: "solar:pen-linear",
      onClick: onEdit,
      variant: "outline",
    },
    onDelete && {
      key: "delete",
      label: intl.formatMessage({ id: "action_delete", defaultMessage: "Delete" }),
      icon: "solar:trash-bin-trash-linear",
      onClick: onDelete,
      variant: "danger",
    },
    onBack && {
      key: "back",
      label: intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" }),
      icon: "solar:alt-arrow-left-linear",
      onClick: onBack,
      variant: "ghost",
    },
  ].filter((x): x is Action => Boolean(x));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </h1>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {items.map((action, idx) => (
          <div key={action.key} className="flex items-center gap-2">
            {idx > 0 && divider}
            <Button
              variant={action.variant ?? "outline"}
              onClick={action.onClick}
              disabled={isDisabled}
              leftIcon={<Icon icon={action.icon} className="h-4 w-4" />}
            >
              <span className="hidden sm:inline">{action.label}</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
