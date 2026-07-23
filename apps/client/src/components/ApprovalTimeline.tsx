import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  Clock,
  FileText,
  Lightbulb,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import { useIntl } from "react-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ApprovalHistoryEntry {
  message: string | null;
  process: string;
  userName: string;
  timeframe: string;
  aiValidationStatus?: string;
  aiValidationResult?: AiValidationResult;
  aiValidatedAt?: string;
  aiValidationError?: string;
}

interface AiValidationResult {
  valid: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  analysis: string;
}

interface TimelineEntry {
  type: "approval" | "ai-validation";
  process: string;
  userName: string;
  timeframe: string;
  message: string | null;
  aiResult?: AiValidationResult;
  aiValidationStatus?: string;
  aiValidationError?: string;
}

interface ApprovalTimelineProps {
  approvalHistory?: unknown;
  aiValidationResult?: AiValidationResult;
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
      typeof entry.name === "string" && entry.name.trim().length > 0
        ? entry.name.trim()
        : typeof entry.userName === "string" && entry.userName.trim().length > 0
          ? entry.userName.trim()
          : process === "AI VALIDATION" || process === "AI_VALIDATED"
            ? "System"
            : "Unknown user";
    const timeframe =
      typeof entry.dateTime === "string" && entry.dateTime.trim().length > 0
        ? entry.dateTime.trim()
        : typeof entry.timeframe === "string" && entry.timeframe.trim().length > 0
          ? entry.timeframe.trim()
          : "Unknown time";
    const message =
      typeof entry.message === "string" && entry.message.trim().length > 0
        ? entry.message.trim()
        : null;

    const aiValidationStatus =
      typeof entry.aiValidationStatus === "string"
        ? entry.aiValidationStatus
        : undefined;
    const aiValidationResult = isRecord(entry.aiValidationResult)
      ? (entry.aiValidationResult as unknown as AiValidationResult)
      : undefined;
    const aiValidatedAt =
      typeof entry.aiValidatedAt === "string" ? entry.aiValidatedAt : undefined;
    const aiValidationError =
      typeof entry.aiValidationError === "string"
        ? entry.aiValidationError
        : undefined;

    return [
      {
        message,
        process,
        userName,
        timeframe,
        aiValidationStatus,
        aiValidationResult,
        aiValidatedAt,
        aiValidationError,
      },
    ];
  });
};

const getTimelineTone = (process: string) => {
  switch (process) {
    case "APPROVED":
      return {
        badge: "border-transparent bg-success/15 text-success",
        dot: "bg-success",
        Icon: CheckCircle2,
      };
    case "REJECTED":
      return {
        badge: "border-transparent bg-destructive/10 text-destructive",
        dot: "bg-destructive",
        Icon: XCircle,
      };
    case "PROPOSED":
    case "SUBMIT":
      return {
        badge: "border-transparent bg-warning/15 text-warning",
        dot: "bg-warning",
        Icon: Send,
      };
    case "AI VALIDATION":
    case "AI_VALIDATED":
      return {
        badge: "border-transparent bg-info/15 text-info",
        dot: "bg-info",
        Icon: Bot,
      };
    case "DRAFT":
    case "CREATE":
      return {
        badge: "border-transparent bg-muted text-muted-foreground",
        dot: "bg-muted-foreground",
        Icon: FileText,
      };
    default:
      return {
        badge: "border-transparent bg-muted text-muted-foreground",
        dot: "bg-muted-foreground",
        Icon: Clock,
      };
  }
};

const formatDate = (timeframe: string, fallback: string) => {
  if (!timeframe) return fallback;
  const d = new Date(timeframe);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString();
};

const scoreClass = (score: number) => {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-destructive";
};

const riskClass = (risk: string) => {
  switch (risk) {
    case "LOW":
      return "text-success";
    case "MEDIUM":
      return "text-warning";
    case "HIGH":
      return "text-destructive";
    default:
      return "text-foreground";
  }
};

export const ApprovalTimeline = ({
  approvalHistory,
}: ApprovalTimelineProps) => {
  const intl = useIntl();
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

  const unknownTime = intl.formatMessage({
    id: "inbound_transaction.history_time_unknown",
    defaultMessage: "Unknown time",
  });

  const entries = useMemo(() => {
    const parsed = parseApprovalHistory(approvalHistory);
    const timelineEntries: TimelineEntry[] = parsed.map((entry) => {
      const isAiValidation =
        entry.process === "AI VALIDATION" || entry.process === "AI_VALIDATED";
      return {
        type: isAiValidation ? "ai-validation" : "approval",
        process: entry.process,
        userName: entry.userName,
        timeframe: entry.timeframe,
        message: entry.message,
        aiResult: entry.aiValidationResult,
        aiValidationStatus: entry.aiValidationStatus,
        aiValidationError: entry.aiValidationError,
      };
    });

    return [...timelineEntries].sort((a, b) => {
      const aTime = new Date(a.timeframe).getTime();
      const bTime = new Date(b.timeframe).getTime();
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
      if (Number.isNaN(aTime)) return 1;
      if (Number.isNaN(bTime)) return -1;
      return aTime - bTime;
    });
  }, [approvalHistory]);

  const toggleEntry = (idx: number) => {
    setExpandedEntry(expandedEntry === idx ? null : idx);
  };

  if (entries.length === 0) return null;

  return (
    <div className="w-full">
      <ol className="relative m-0 flex list-none flex-col gap-5 py-1 pl-6">
        <span
          aria-hidden
          className="absolute top-2 bottom-2 left-1.5 w-0.5 bg-gradient-to-b from-border to-muted-foreground/30"
        />
        {entries.map((entry, idx) => {
          const tone = getTimelineTone(entry.process);
          const Icon = tone.Icon;
          const isExpanded = expandedEntry === idx;
          const hasDetails = entry.type === "ai-validation" && entry.aiResult;

          return (
            <li key={idx} className="relative">
              <span
                className={cn(
                  "absolute top-1.5 -left-6 z-[1] size-3.5 rounded-full ring-[3px] ring-background",
                  tone.dot,
                )}
              />
              <div className="flex flex-col gap-1.5">
                <div
                  className={cn(
                    "flex flex-wrap items-center gap-2.5",
                    hasDetails &&
                      "-mx-2 -my-1 cursor-pointer rounded-md px-2 py-1 transition-colors hover:bg-muted/60",
                  )}
                  onClick={() => hasDetails && toggleEntry(idx)}
                  onKeyDown={(e) => {
                    if (!hasDetails) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleEntry(idx);
                    }
                  }}
                  role={hasDetails ? "button" : undefined}
                  tabIndex={hasDetails ? 0 : undefined}
                >
                  <Badge className={cn("gap-1.5 uppercase", tone.badge)}>
                    <Icon className="size-3.5" aria-hidden />
                    {entry.process}
                  </Badge>
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatDate(entry.timeframe, unknownTime)}
                  </span>
                  {hasDetails ? (
                    isExpanded ? (
                      <ChevronUp
                        className="ml-auto size-4 text-muted-foreground"
                        aria-hidden
                      />
                    ) : (
                      <ChevronDown
                        className="ml-auto size-4 text-muted-foreground"
                        aria-hidden
                      />
                    )
                  ) : null}
                </div>
                <p className="m-0 text-sm font-medium text-foreground">
                  {entry.userName}
                </p>
                {entry.message ? (
                  <p className="m-0 text-sm leading-relaxed text-muted-foreground">
                    {entry.message}
                  </p>
                ) : null}

                {hasDetails ? (
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-300",
                      isExpanded
                        ? "mt-3 max-h-[2000px] opacity-100"
                        : "mt-0 max-h-0 opacity-0",
                    )}
                  >
                    <div className="rounded-lg border border-border bg-card p-4">
                      {entry.aiValidationStatus === "FAILED" ? (
                        <div className="flex flex-col items-start gap-2 text-destructive">
                          <AlertTriangle className="size-6" aria-hidden />
                          <h4 className="m-0 text-sm font-semibold">
                            Validation Failed
                          </h4>
                          <p className="m-0 text-sm text-muted-foreground">
                            {entry.aiValidationError ||
                              "Unknown error occurred during validation"}
                          </p>
                        </div>
                      ) : entry.aiResult ? (
                        <>
                          <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-4 border-b border-border pb-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                Score
                              </span>
                              <span
                                className={cn(
                                  "text-lg font-bold tabular-nums",
                                  scoreClass(entry.aiResult.score),
                                )}
                              >
                                {entry.aiResult.score}/100
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                Risk Level
                              </span>
                              <span
                                className={cn(
                                  "text-lg font-bold",
                                  riskClass(entry.aiResult.riskLevel),
                                )}
                              >
                                {entry.aiResult.riskLevel}
                              </span>
                            </div>
                          </div>

                          {entry.aiResult.issues.length > 0 ? (
                            <div className="mb-4 last:mb-0">
                              <h4 className="mb-2 flex items-center gap-2 text-[13px] font-semibold tracking-wide text-foreground uppercase">
                                <CircleDashed
                                  className="size-4 text-destructive"
                                  aria-hidden
                                />
                                Issues
                              </h4>
                              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                                {entry.aiResult.issues.map((issue, i) => (
                                  <li
                                    key={i}
                                    className="relative pl-5 text-[13px] leading-relaxed text-muted-foreground before:absolute before:left-1.5 before:font-bold before:text-muted-foreground before:content-['•']"
                                  >
                                    {issue}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {entry.aiResult.recommendations.length > 0 ? (
                            <div className="mb-4 last:mb-0">
                              <h4 className="mb-2 flex items-center gap-2 text-[13px] font-semibold tracking-wide text-foreground uppercase">
                                <Lightbulb
                                  className="size-4 text-warning"
                                  aria-hidden
                                />
                                Recommendations
                              </h4>
                              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                                {entry.aiResult.recommendations.map(
                                  (rec, i) => (
                                    <li
                                      key={i}
                                      className="relative pl-5 text-[13px] leading-relaxed text-muted-foreground before:absolute before:left-1.5 before:font-bold before:text-muted-foreground before:content-['•']"
                                    >
                                      {rec}
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          ) : null}

                          {entry.aiResult.analysis ? (
                            <div className="mb-0">
                              <h4 className="mb-2 flex items-center gap-2 text-[13px] font-semibold tracking-wide text-foreground uppercase">
                                <Search className="size-4" aria-hidden />
                                Analysis
                              </h4>
                              <p className="m-0 text-[13px] leading-relaxed text-muted-foreground">
                                {entry.aiResult.analysis}
                              </p>
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
