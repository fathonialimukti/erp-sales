import type { ReactNode } from "react";
import { Icon } from "./";
import "./EmptyState.css";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => (
  <div className={`empty ${className ?? ""}`}>
    <div className="empty__icon-wrapper">
      {icon ?? <Icon icon="solar:inbox-linear" />}
    </div>
    <div className="empty__text">
      <p className="empty__title">{title}</p>
      {description && <p className="empty__desc">{description}</p>}
    </div>
    {action}
  </div>
);
