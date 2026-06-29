import { useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { Icon } from "../ui";
import "./ApprovalTimeline.css";

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
      (typeof entry.name === "string" && entry.name.trim().length > 0
        ? entry.name.trim()
        : typeof entry.userName === "string" && entry.userName.trim().length > 0
          ? entry.userName.trim()
          : process === "AI VALIDATION" || process === "AI_VALIDATED"
            ? "System"
            : "Unknown user");
    const timeframe =
      (typeof entry.dateTime === "string" && entry.dateTime.trim().length > 0
        ? entry.dateTime.trim()
        : typeof entry.timeframe === "string" && entry.timeframe.trim().length > 0
          ? entry.timeframe.trim()
          : "Unknown time");
    const message =
      typeof entry.message === "string" && entry.message.trim().length > 0
        ? entry.message.trim()
        : null;
    
    // Extract AI validation data from the entry
    const aiValidationStatus = typeof entry.aiValidationStatus === "string" ? entry.aiValidationStatus : undefined;
    const aiValidationResult = isRecord(entry.aiValidationResult) ? entry.aiValidationResult as unknown as AiValidationResult : undefined;
    const aiValidatedAt = typeof entry.aiValidatedAt === "string" ? entry.aiValidatedAt : undefined;
    const aiValidationError = typeof entry.aiValidationError === "string" ? entry.aiValidationError : undefined;
    
    return [{ 
      message, 
      process, 
      userName, 
      timeframe,
      aiValidationStatus,
      aiValidationResult,
      aiValidatedAt,
      aiValidationError,
    }];
  });
};

const getTimelineTone = (process: string) => {
  switch (process) {
    case "APPROVED":
      return { badgeClass: "at-badge--approved", dotClass: "at-dot--approved", icon: "solar:check-circle-bold" };
    case "REJECTED":
      return { badgeClass: "at-badge--rejected", dotClass: "at-dot--rejected", icon: "solar:close-circle-bold" };
    case "PROPOSED":
    case "SUBMIT":
      return { badgeClass: "at-badge--proposed", dotClass: "at-dot--proposed", icon: "solar:send-bold" };
    case "AI VALIDATION":
    case "AI_VALIDATED":
      return { badgeClass: "at-badge--ai", dotClass: "at-dot--ai", icon: "solar:robot-bold" };
    case "DRAFT":
    case "CREATE":
      return { badgeClass: "at-badge--draft", dotClass: "at-dot--draft", icon: "solar:document-text-bold" };
    default:
      return { badgeClass: "at-badge--default", dotClass: "at-dot--default", icon: "solar:clock-circle-bold" };
  }
};

const formatDate = (timeframe: string, fallback: string) => {
  if (!timeframe) return fallback;
  const d = new Date(timeframe);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString();
};

export const ApprovalTimeline = ({ approvalHistory, aiValidationResult }: ApprovalTimelineProps) => {
  const intl = useIntl();
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

  const unknownTime = intl.formatMessage({
    id: "inbound_transaction.history_time_unknown",
    defaultMessage: "Unknown time",
  });

  const entries = useMemo(() => {
    const parsed = parseApprovalHistory(approvalHistory);
    const timelineEntries: TimelineEntry[] = parsed.map((entry) => {
      const isAiValidation = entry.process === "AI VALIDATION" || entry.process === "AI_VALIDATED";
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
    <div className="at-container">
      <ol className="at-timeline">
        {entries.map((entry, idx) => {
          const tone = getTimelineTone(entry.process);
          const isExpanded = expandedEntry === idx;
          const hasDetails = entry.type === "ai-validation" && entry.aiResult;

          return (
            <li key={idx} className={`at-entry ${isExpanded ? "at-entry--expanded" : ""}`}>
              <span className={`at-dot ${tone.dotClass}`} />
              <div className="at-entry__content">
                <div
                  className={`at-entry__header ${hasDetails ? "at-entry__header--clickable" : ""}`}
                  onClick={() => hasDetails && toggleEntry(idx)}
                >
                  <span className={`at-badge ${tone.badgeClass}`}>
                    <Icon icon={tone.icon} sizes="14" />
                    {entry.process}
                  </span>
                  <span className="at-entry__time">{formatDate(entry.timeframe, unknownTime)}</span>
                  {hasDetails && (
                    <Icon
                      icon={isExpanded ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
                      sizes="16"
                      className="at-entry__expand-icon"
                    />
                  )}
                </div>
                <p className="at-entry__user">{entry.userName}</p>
                {entry.message && <p className="at-entry__message">{entry.message}</p>}

                {hasDetails && (
                  <div className="at-entry__details-wrapper">
                    <div className="at-entry__details">
                      {entry.aiValidationStatus === "FAILED" ? (
                        <div className="at-ai-error">
                          <Icon icon="solar:danger-triangle-bold" sizes="24" />
                          <h4>Validation Failed</h4>
                          <p>{entry.aiValidationError || "Unknown error occurred during validation"}</p>
                        </div>
                      ) : entry.aiResult ? (
                        <>
                          <div className="at-ai-summary">
                            <div className="at-ai-metric">
                              <span className="at-ai-metric__label">Score</span>
                              <span className={`at-ai-metric__value at-ai-score--${entry.aiResult.score >= 70 ? "high" : entry.aiResult.score >= 40 ? "medium" : "low"}`}>
                                {entry.aiResult.score}/100
                              </span>
                            </div>
                            <div className="at-ai-metric">
                              <span className="at-ai-metric__label">Risk Level</span>
                              <span className={`at-ai-metric__value at-ai-risk--${entry.aiResult.riskLevel.toLowerCase()}`}>
                                {entry.aiResult.riskLevel}
                              </span>
                            </div>
                          </div>

                          {entry.aiResult.issues.length > 0 && (
                            <div className="at-ai-section">
                              <h4 className="at-ai-section__title">
                                <Icon icon="solar:danger-circle-bold" sizes="16" />
                                Issues
                              </h4>
                              <ul className="at-ai-list">
                                {entry.aiResult.issues.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {entry.aiResult.recommendations.length > 0 && (
                            <div className="at-ai-section">
                              <h4 className="at-ai-section__title">
                                <Icon icon="solar:lightbulb-bold" sizes="16" />
                                Recommendations
                              </h4>
                              <ul className="at-ai-list">
                                {entry.aiResult.recommendations.map((rec, i) => (
                                  <li key={i}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {entry.aiResult.analysis && (
                            <div className="at-ai-section">
                              <h4 className="at-ai-section__title">
                                <Icon icon="solar:magnifer-bold" sizes="16" />
                                Analysis
                              </h4>
                              <p className="at-ai-analysis">{entry.aiResult.analysis}</p>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
