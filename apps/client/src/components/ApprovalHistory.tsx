import { useMemo, useState } from "react";
import { Icon } from "../ui";
import { useIntl } from "react-intl";
import { Button } from "../ui/Button";
import { Modal, ModalHeader, ModalBody } from "../ui/Modal";
import { EmptyState } from "../ui/EmptyState";
import "./ApprovalHistory.css";

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
  history?: unknown;
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
    case "APPROVED": return { badgeClass: "ah-badge--approved", dotClass: "ah-dot--approved" };
    case "REJECTED": return { badgeClass: "ah-badge--rejected", dotClass: "ah-dot--rejected" };
    case "PROPOSED": return { badgeClass: "ah-badge--proposed", dotClass: "ah-dot--proposed" };
    default: return { badgeClass: "ah-badge--default", dotClass: "ah-dot--default" };
  }
};

const formatDate = (timeframe: string, fallback: string) => {
  if (!timeframe) return fallback;
  const d = new Date(timeframe);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString();
};

export const ApprovalHistory = ({ approvalHistory, history }: ApprovalHistoryProps) => {
  const intl = useIntl();
  const [isOpen, setIsOpen] = useState(false);

  const unknownTime = intl.formatMessage({
    id: "inbound_transaction.history_time_unknown",
    defaultMessage: "Unknown time",
  });

  const entries = useMemo(() => {
    const parsed = parseApprovalHistory(approvalHistory ?? history);
    return [...parsed].sort((a, b) => {
      const aTime = new Date(a.timeframe).getTime();
      const bTime = new Date(b.timeframe).getTime();
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
      if (Number.isNaN(aTime)) return 1;
      if (Number.isNaN(bTime)) return -1;
      return aTime - bTime;
    });
  }, [approvalHistory, history]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        leftIcon={<Icon icon="solar:history-linear" />}
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
            <ol className="ah-timeline">
              {entries.map((entry, idx) => {
                const tone = getTimelineTone(entry.process);
                return (
                  <li key={idx} className="ah-entry">
                    <span className={`ah-dot ${tone.dotClass}`} />
                    <div className="ah-entry__content">
                      <div className="ah-entry__header">
                        <span className={`ah-badge ${tone.badgeClass}`}>{entry.process}</span>
                        <span className="ah-entry__time">{formatDate(entry.timeframe, unknownTime)}</span>
                      </div>
                      <p className="ah-entry__user">{entry.userName}</p>
                      {entry.message && <p className="ah-entry__message">{entry.message}</p>}
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
