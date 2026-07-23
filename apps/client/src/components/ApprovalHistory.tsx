import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { useIntl } from "react-intl";

import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ApprovalHistoryEntry {
  message: string | null;
  process: string;
  userName: string;
  timeframe: string;
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

const processTone = (process: string) => {
  switch (process) {
    case "APPROVED":
      return {
        badge: "border-transparent bg-success/15 text-success",
        dot: "bg-success",
      };
    case "REJECTED":
      return {
        badge: "border-transparent bg-destructive/10 text-destructive",
        dot: "bg-destructive",
      };
    case "PROPOSED":
      return {
        badge: "border-transparent bg-warning/15 text-warning",
        dot: "bg-warning",
      };
    default:
      return {
        badge: "border-transparent bg-muted text-muted-foreground",
        dot: "bg-muted-foreground",
      };
  }
};

const formatDate = (timeframe: string, fallback: string) => {
  if (!timeframe) return fallback;
  const d = new Date(timeframe);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString();
};

export const ApprovalHistory = ({
  approvalHistory,
  history,
}: ApprovalHistoryProps) => {
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
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <History className="size-4" aria-hidden />
        {intl.formatMessage({
          id: "activitylog_audittraildetail",
          defaultMessage: "Audit Trail",
        })}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {intl.formatMessage({
                id: "activitylog_audittraildetail",
                defaultMessage: "Audit Trail",
              })}
            </DialogTitle>
          </DialogHeader>

          {entries.length === 0 ? (
            <EmptyState
              title={intl.formatMessage({
                id: "activitylog_detail_nodetails",
                defaultMessage: "No details available.",
              })}
            />
          ) : (
            <ol className="relative flex flex-col gap-4 border-l border-border pl-5">
              {entries.map((entry, idx) => {
                const tone = processTone(entry.process);
                return (
                  <li key={idx} className="relative">
                    <span
                      className={cn(
                        "absolute top-1 -left-[27px] size-3 rounded-full ring-2 ring-card",
                        tone.dot,
                      )}
                    />
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={tone.badge}>{entry.process}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(entry.timeframe, unknownTime)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {entry.userName}
                      </p>
                      {entry.message ? (
                        <p className="text-sm text-muted-foreground">
                          {entry.message}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
