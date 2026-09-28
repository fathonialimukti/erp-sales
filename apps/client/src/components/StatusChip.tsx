import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleOff,
  Clock,
  FileText,
  Flame,
  Inbox,
  MailWarning,
  PauseCircle,
  ShieldAlert,
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

/** Soft plate + bold semantic label + icon — never color-only. */
const STATUS_STYLES: Record<string, StatusStyle> = {
  // Approval workflow (design law frozen map)
  DRAFT: {
    icon: FileText,
    className: "border-border/70 bg-muted text-foreground",
    messageId: "common.status.draft",
    defaultMessage: "Draft",
  },
  PROPOSED: {
    icon: Clock,
    className: "border-primary/25 bg-primary/12 text-primary",
    messageId: "common.status.proposed",
    defaultMessage: "Proposed",
  },
  APPROVED: {
    icon: CheckCircle2,
    className: "border-success/30 bg-success/15 text-success",
    messageId: "common.status.approved",
    defaultMessage: "Approved",
  },
  REJECTED: {
    icon: XCircle,
    className: "border-destructive/30 bg-destructive/12 text-destructive",
    messageId: "common.status.rejected",
    defaultMessage: "Rejected",
  },

  // Lifecycle / master data
  ACTIVE: {
    icon: CircleCheck,
    className: "border-success/30 bg-success/15 text-success",
    messageId: "common.status.active",
    defaultMessage: "Active",
  },
  INACTIVE: {
    icon: CircleOff,
    className: "border-border/70 bg-muted text-foreground",
    messageId: "common.status.inactive",
    defaultMessage: "Inactive",
  },
  ENABLED: {
    icon: CircleCheck,
    className: "border-success/30 bg-success/15 text-success",
    messageId: "common.status.enabled",
    defaultMessage: "Enabled",
  },
  DISABLED: {
    icon: Ban,
    className: "border-border/70 bg-muted text-foreground",
    messageId: "common.status.disabled",
    defaultMessage: "Disabled",
  },

  // Inbox / queue
  OPEN: {
    icon: Inbox,
    className: "border-primary/25 bg-primary/12 text-primary",
    messageId: "common.status.open",
    defaultMessage: "Open",
  },
  PENDING: {
    icon: PauseCircle,
    className: "border-warning/35 bg-warning/15 text-warning-foreground dark:text-warning",
    messageId: "common.status.pending",
    defaultMessage: "Pending",
  },
  RESOLVED: {
    icon: CheckCircle2,
    className: "border-success/30 bg-success/15 text-success",
    messageId: "common.status.resolved",
    defaultMessage: "Resolved",
  },
  CLOSED: {
    icon: CircleOff,
    className: "border-border/70 bg-muted text-foreground",
    messageId: "common.status.closed",
    defaultMessage: "Closed",
  },
  SPAM: {
    icon: MailWarning,
    className: "border-destructive/30 bg-destructive/12 text-destructive",
    messageId: "common.status.spam",
    defaultMessage: "Spam",
  },

  // Ops / pipeline extras
  IN_PROGRESS: {
    icon: CircleDot,
    className: "border-primary/25 bg-primary/12 text-primary",
    messageId: "common.status.in_progress",
    defaultMessage: "In progress",
  },
  VALIDATING: {
    icon: CircleDashed,
    className: "border-primary/25 bg-primary/12 text-primary",
    messageId: "common.status.validating",
    defaultMessage: "Validating",
  },
  COMPLETED: {
    icon: CheckCircle2,
    className: "border-success/30 bg-success/15 text-success",
    messageId: "common.status.completed",
    defaultMessage: "Completed",
  },
  CANCELLED: {
    icon: Ban,
    className: "border-destructive/30 bg-destructive/12 text-destructive",
    messageId: "common.status.cancelled",
    defaultMessage: "Cancelled",
  },
  FAILED: {
    icon: ShieldAlert,
    className: "border-destructive/30 bg-destructive/12 text-destructive",
    messageId: "common.status.failed",
    defaultMessage: "Failed",
  },

  // Priority
  LOW: {
    icon: CircleDashed,
    className: "border-border/70 bg-muted text-foreground",
    messageId: "common.priority.low",
    defaultMessage: "Low",
  },
  NORMAL: {
    icon: CircleDot,
    className: "border-primary/25 bg-primary/12 text-primary",
    messageId: "common.priority.normal",
    defaultMessage: "Normal",
  },
  HIGH: {
    icon: AlertTriangle,
    className: "border-warning/35 bg-warning/15 text-warning-foreground dark:text-warning",
    messageId: "common.priority.high",
    defaultMessage: "High",
  },
  URGENT: {
    icon: Flame,
    className: "border-destructive/30 bg-destructive/12 text-destructive",
    messageId: "common.priority.urgent",
    defaultMessage: "Urgent",
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
      className={cn("gap-1 font-semibold shadow-sm", style.className, className)}
      data-status={key}
    >
      <Icon aria-hidden className="size-3" />
      <span>{resolvedLabel}</span>
    </Badge>
  );
};
