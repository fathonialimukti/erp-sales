import { useMemo, useState } from "react";
import { Icon } from "../ui";
import { useIntl } from "react-intl";
import { Button } from "../ui/Button";
import { Modal, ModalHeader, ModalBody } from "../ui/Modal";
import { EmptyState } from "../ui/EmptyState";
import { cn } from "../ui/cn";

interface ApprovalHistoryEntry {
  message: string | null;
  process: string;
  userName: string;
  timeframe: string;
}

interface TimelineTone {
  badgeClass: string;
  dotClass: string;
}

interface ApprovalHistoryProps {
  approvalHistory?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseApprovalHistory = (value: unknown): ApprovalHistoryEntry[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const process =
      typeof entry.process === "string" && entry.process.trim().length > 0
        ? entry.process.trim().toUpperCase()
        : "UNKNOWN";
    const userName =
      typeof entry.userName === "string" && entry.userName.trim().length > 0
        ? entry.userName.trim()
        : "Unknown user";
    const timeframe =
      typeof entry.timeframe === "string" && entry.timeframe.trim().length > 0
        ? entry.timeframe.trim()
        : "Unknown time";
    const message =
      typeof entry.message === "string" && entry.message.trim().length > 0
        ? entry.message.trim()
        : null;
    return [{ message, process, userName, timeframe }];
  });
};

const getTimelineTone = (process: string): TimelineTone => {
  switch (process) {
    case "APPROVED":
      return { badgeClass: "bg-state-success-bg text-state-success", dotClass: "bg-state-success" };
    case "REJECTED":
      return { badgeClass: "bg-state-danger-bg text-state-danger", dotClass: "bg-state-danger" };
    case "PROPOSED":
      return { badgeClass: "bg-state-warning-bg text-state-warning", dotClass: "bg-state-warning" };
    default:
      return { badgeClass: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200", dotClass: "bg-slate-400" };
  }
};

const formatDate = (timeframe: string, fallback: string) => {
  if (!timeframe) return fallback;
  const d = new Date(timeframe);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString();
};

export const ApprovalHistory = ({ approvalHistory }: ApprovalHistoryProps) => {
  const intl = useIntl();
  const [isOpen, setIsOpen] = useState(false);

  const unknownTime = intl.formatMessage({
    id: "inbound_transaction.history_time_unknown",
    defaultMessage: "Unknown time",
  });

  const entries = useMemo(() => {
    const parsed = parseApprovalHistory(approvalHistory);
    return [...parsed].sort((a, b) => {
      const aTime = new Date(a.timeframe).getTime();
      const bTime = new Date(b.timeframe).getTime();
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
      if (Number.isNaN(aTime)) return 1;
      if (Number.isNaN(bTime)) return -1;
      return aTime - bTime;
    });
  }, [approvalHistory]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        leftIcon={<Icon icon="solar:history-linear" className="h-4 w-4" />}
      >
        {intl.formatMessage({ id: "activitylog_audittraildetail", defaultMessage: "Audit Trail" })}
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="lg">
        <ModalHeader onClose={() => setIsOpen(false)}>
          {intl.formatMessage({ id: "activitylog_audittraildetail", defaultMessage: "Audit Trail" })}
        </ModalHeader>
        <ModalBody>
          {entries.length === 0 ? (
            <EmptyState
              icon="solar:history-linear"
              title={intl.formatMessage({
                id: "activitylog_detail_nodetails",
                defaultMessage: "No details available.",
              })}
            />
          ) : (
            <ol className="relative space-y-4 border-l border-slate-200 pl-5 dark:border-slate-800">
              {entries.map((entry, idx) => {
                const tone = getTimelineTone(entry.process);
                return (
                  <li key={idx} className="relative">
                    <span
                      className={cn(
                        "absolute -left-[27px] top-1 inline-block h-3 w-3 rounded-full ring-2 ring-surface-1",
                        tone.dotClass,
                      )}
                    />
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            tone.badgeClass,
                          )}
                        >
                          {entry.process}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDate(entry.timeframe, unknownTime)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {entry.userName}
                      </p>
                      {entry.message && (
                        <p className="text-sm text-slate-600 dark:text-slate-300">{entry.message}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </ModalBody>
      </Modal>
    </>
  );
};
