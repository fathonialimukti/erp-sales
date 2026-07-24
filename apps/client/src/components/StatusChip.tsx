import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  CircleDashed,
  Clock,
  FileText,
  XCircle,
} from "lucide-react";
import { useIntl } from "react-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusChipStatus =
  | "DRAFT"
  | "PROPOSED"
  | "APPROVED"
  | "REJECTED"
  | (string & {});

interface StatusChipProps {
  status: StatusChipStatus;
  /** Override label; defaults to i18n for known statuses or title-cased status. */
  label?: string;
  className?: string;
}

interface StatusStyle {
  icon: LucideIcon;
  className: string;
  messageId: string;
  defaultMessage: string;
}

const STATUS_STYLES: Record<string, StatusStyle> = {
  DRAFT: {
    icon: FileText,
    className: "border-border/60 bg-muted text-foreground",
    messageId: "common.status.draft",
    defaultMessage: "Draft",
  },
  PROPOSED: {
    icon: Clock,
    className: "border-primary/20 bg-primary/12 text-primary",
    messageId: "common.status.proposed",
    defaultMessage: "Proposed",
  },
  APPROVED: {
    icon: CheckCircle2,
    className: "border-success/25 bg-success/15 text-success",
    messageId: "common.status.approved",
    defaultMessage: "Approved",
  },
  REJECTED: {
    icon: XCircle,
    className: "border-destructive/25 bg-destructive/12 text-destructive",
    messageId: "common.status.rejected",
    defaultMessage: "Rejected",
  },
};

const FALLBACK_STYLE: StatusStyle = {
  icon: CircleDashed,
  className: "border-border bg-muted text-foreground",
  messageId: "common.status.unknown",
  defaultMessage: "Unknown",
};

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const StatusChip = ({ status, label, className }: StatusChipProps) => {
  const intl = useIntl();
  const key = status.toUpperCase();
  const style = STATUS_STYLES[key] ?? FALLBACK_STYLE;
  const Icon = style.icon;

  const resolvedLabel =
    label ??
    (STATUS_STYLES[key]
      ? intl.formatMessage({
          id: style.messageId,
          defaultMessage: style.defaultMessage,
        })
      : titleCase(status));

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium", style.className, className)}
      data-status={key}
    >
      <Icon aria-hidden className="size-3" />
      <span>{resolvedLabel}</span>
    </Badge>
  );
};
