import { useState } from "react";
import { createPortal } from "react-dom";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { ButtonGroup } from "../../components/ButtonGroup";
import { Chip } from "../../ui/Chip";
import { Spinner } from "../../ui/Spinner";
import { useToast } from "../../ui/useToast";
import { EmailCrmIcon } from "./EmailCrmIcons";

type AgentStatus = "IDLE" | "RUNNING" | "SENT" | "FAILED" | string;

const STATUS_TONE: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  OPEN: "info",
  PENDING: "warning",
  RESOLVED: "success",
  SPAM: "neutral",
};

const PRIORITY_TONE: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  LOW: "neutral",
  NORMAL: "info",
  HIGH: "warning",
  URGENT: "danger",
};

const AGENT_TONE: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  IDLE: "neutral",
  RUNNING: "warning",
  SENT: "success",
  FAILED: "danger",
};

type EmailMessage = {
  id: string;
  direction: string;
  body: string;
  htmlBody?: string | null;
  sendStatus?: string | null;
  sentAt?: string | Date | null;
  createdAt: string | Date;
};

type EmailCrmDetail = {
  id: string;
  email: string;
  subject: string | null;
  status: string;
  priority: string;
  sentiment: string | null;
  tags: unknown;
  lastMessageAt: string | Date | null;
  agentStatus?: AgentStatus | null;
  agentError?: string | null;
  lastOutboundAt?: string | Date | null;
  customer: { id: string; name: string; code: string | null } | null;
  messages: EmailMessage[];
  salesOrders: {
    id: string;
    documentNumber: string | null;
    approvalStatus: string;
    grandTotal: unknown;
    createdAt: string | Date;
  }[];
};

const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const tagsToLabel = (tags: unknown) => {
  if (!Array.isArray(tags) || tags.length === 0) return "—";
  return tags.filter((t): t is string => typeof t === "string").join(", ") || "—";
};

/**
 * Outbound-only HTML sanitize (mirror server roughly).
 * Strips script/iframe/object/form, on* handlers, javascript: URLs.
 * Returns null when nothing safe remains → caller falls back to plain body.
 */
const sanitizeOutboundHtml = (html: string): string | null => {
  const cleaned = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "")
    .replace(/<form[\s\S]*?>[\s\S]*?<\/form>/gi, "")
    .replace(/<\/?(?:script|iframe|object|form|embed|link|meta|base)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
};

const agentStatusTint = (status: AgentStatus | null | undefined) => {
  switch (status) {
    case "RUNNING":
      return { tint: "warning" as const, className: "so-status--warning" };
    case "SENT":
      return { tint: "success" as const, className: "so-status--success" };
    case "FAILED":
      return { tint: "danger" as const, className: "so-status--danger" };
    default:
      return { tint: "neutral" as const, className: "so-status--neutral" };
  }
};

export const EmailCrmDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("email-crm@update");
  const canDelete = hasPermission("email-crm@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [composeBody, setComposeBody] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["emailCrmDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.emailCrm.detail.query({ id: id ?? "" }),
    refetchInterval: (query) => {
      const status = (query.state.data as EmailCrmDetail | undefined)?.agentStatus;
      // ponytail: server only uses RUNNING while work is in flight
      return status === "RUNNING" ? 2000 : false;
    },
  });

  const conversation = data as EmailCrmDetail | undefined;

  const invalidateDetail = async () => {
    await queryClient.invalidateQueries({ queryKey: ["emailCrmDetail", id] });
    await queryClient.invalidateQueries({ queryKey: ["emailCrmList"] });
  };

  const sendReplyMutation = useMutation({
    mutationFn: (body: string) =>
      trpcClient.emailCrm.sendMessage.mutate({
        conversationId: id ?? "",
        body,
      }),
    onSuccess: async () => {
      setComposeBody("");
      await invalidateDetail();
      toast.success(
        intl.formatMessage({ id: "emailCrm.detail.reply_sent", defaultMessage: "Reply sent" }),
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to send reply"),
  });

  const suggestMutation = useMutation({
    mutationFn: () =>
      trpcClient.emailCrm.suggestReply.mutate({
        conversationId: id ?? "",
        instruction: aiInstruction.trim() || undefined,
        save: false,
      }),
    onSuccess: (result) => {
      setComposeBody(result.draft ?? "");
      toast.success(
        intl.formatMessage({ id: "emailCrm.detail.suggest_ready", defaultMessage: "Suggestion ready" }),
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to suggest reply"),
  });

  const retryAgentMutation = useMutation({
    mutationFn: () =>
      trpcClient.emailCrm.retryAgent.mutate({
        conversationId: id ?? "",
      }),
    onSuccess: async () => {
      await invalidateDetail();
      toast.success(
        intl.formatMessage({ id: "emailCrm.detail.agent_running", defaultMessage: "Agent is running…" }),
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to retry agent"),
  });

  const handleDelete = async () => {
    if (!conversation || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.emailCrm.delete.mutate({ id: conversation.id });
      await queryClient.invalidateQueries({ queryKey: ["emailCrmList"] });
      setDeleteModalOpen(false);
      toast.success(
        intl.formatMessage({ id: "emailCrm.detail.delete_success", defaultMessage: "Conversation deleted" }),
      );
      navigate("/email-crm");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="so-page">
        <div className="so-loading">
          <Spinner size="lg" />
          <span>{intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}</span>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="so-page">
        <div className="so-form__shell" style={{ maxWidth: 480, margin: "60px auto" }}>
          <div className="so-card">
            <div className="so-card__body">
              <p style={{ color: "var(--ios-state-danger, #DC2626)", margin: 0 }}>
                {intl.formatMessage({ id: "emailCrm.detail.not_found", defaultMessage: "Conversation not found" })}
              </p>
              <button
                type="button"
                className="so-btn so-btn--ghost"
                style={{ marginTop: 12 }}
                onClick={() => navigate("/email-crm")}
              >
                <EmailCrmIcon name="back" size={14} />
                {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const agentStatus = conversation.agentStatus ?? "IDLE";
  const agentTint = agentStatusTint(agentStatus);
  const agentRunning = agentStatus === "RUNNING";
  const busy =
    sendReplyMutation.isPending || suggestMutation.isPending || retryAgentMutation.isPending || agentRunning;

  return (
    <section
      className="so-page"
      data-ai-context={JSON.stringify({
        section: "email-crm-detail",
        id: conversation.id,
        email: conversation.email,
        status: conversation.status,
        priority: conversation.priority,
        agentStatus,
        messageCount: conversation.messages?.length ?? 0,
        orderCount: conversation.salesOrders?.length ?? 0,
      })}
    >
      <header className="so-detail-hero">
        <div className="so-detail-hero__top">
          <ButtonGroup
            size="md"
            items={[
              {
                key: "back",
                label: intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" }),
                icon: <EmailCrmIcon name="back" size={14} />,
                to: "/email-crm",
              },
            ]}
          />
          <ButtonGroup
            size="md"
            items={[
              ...(canUpdate && agentStatus === "FAILED"
                ? [
                    {
                      key: "retry-agent",
                      label: intl.formatMessage({
                        id: "emailCrm.detail.retry_agent",
                        defaultMessage: "Retry agent",
                      }),
                      icon: <EmailCrmIcon name="sparkle" size={14} />,
                      onClick: () => retryAgentMutation.mutate(),
                      disabled: retryAgentMutation.isPending,
                      isLoading: retryAgentMutation.isPending,
                      variant: "primary" as const,
                    },
                  ]
                : []),
              ...(canUpdate
                ? [
                    {
                      key: "edit",
                      label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }),
                      icon: <EmailCrmIcon name="edit" size={14} />,
                      to: `/email-crm/${conversation.id}/edit`,
                    },
                  ]
                : []),
              ...(canDelete
                ? [
                    {
                      key: "delete",
                      label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }),
                      icon: <EmailCrmIcon name="delete" size={14} />,
                      onClick: () => setDeleteModalOpen(true),
                      variant: "danger" as const,
                    },
                  ]
                : []),
            ]}
          />
        </div>

        <div className="so-detail-hero__title-block">
          <div className="so-detail-hero__title-row">
            <div className="so-detail-hero__title-stack">
              <span className="so-detail-hero__kicker">
                {intl.formatMessage({ id: "emailCrm.detail.title", defaultMessage: "Email conversation" })}
              </span>
              <h1 className="so-detail-hero__title">{conversation.subject ?? conversation.email}</h1>
              <span className="so-detail-hero__sub">{conversation.email}</span>
              <span className={`so-status ${agentTint.className}`} data-tint={agentTint.tint}>
                {agentRunning ? <Spinner size="sm" /> : <span className="so-status__dot" aria-hidden="true" />}
                <span>
                  {intl.formatMessage({ id: "emailCrm.detail.agent_status", defaultMessage: "Agent" })}:{" "}
                  {agentRunning
                    ? intl.formatMessage({
                        id: "emailCrm.detail.agent_running",
                        defaultMessage: "Agent is running…",
                      })
                    : agentStatus === "FAILED"
                      ? intl.formatMessage({
                          id: "emailCrm.detail.agent_failed",
                          defaultMessage: "Agent failed",
                        })
                      : agentStatus}
                </span>
              </span>
              {agentStatus === "FAILED" && conversation.agentError ? (
                <p style={{ margin: "6px 0 0", color: "var(--ios-state-danger, #DC2626)", fontSize: 13 }}>
                  {conversation.agentError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <section className="so-card">
        <div className="so-card__header">
          <h2 className="so-card__title">
            <span className="so-card__icon">
              <EmailCrmIcon name="inbox" size={14} />
            </span>
            {intl.formatMessage({ id: "emailCrm.detail.summary", defaultMessage: "Summary" })}
          </h2>
        </div>
        <div className="so-card__body">
          <div className="so-section so-section--2">
            <div className="so-field">
              <span className="so-field__label">
                {intl.formatMessage({ id: "emailCrm.form.email", defaultMessage: "Email" })}
              </span>
              <span className="so-field__value">{conversation.email}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">
                {intl.formatMessage({ id: "emailCrm.form.subject", defaultMessage: "Subject" })}
              </span>
              <span className="so-field__value">{conversation.subject ?? "—"}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">
                {intl.formatMessage({ id: "emailCrm.form.status", defaultMessage: "Status" })}
              </span>
              <span className="so-field__value">
                <Chip tone={STATUS_TONE[conversation.status] ?? "neutral"} size="sm">
                  {(() => {
                    const s = conversation.status.toUpperCase();
                    if (s === "OPEN") return intl.formatMessage({ id: "emailCrm.index.status_open", defaultMessage: "Open" });
                    if (s === "PENDING") return intl.formatMessage({ id: "emailCrm.index.status_pending", defaultMessage: "Pending" });
                    if (s === "RESOLVED") return intl.formatMessage({ id: "emailCrm.index.status_resolved", defaultMessage: "Resolved" });
                    if (s === "SPAM") return intl.formatMessage({ id: "emailCrm.index.status_spam", defaultMessage: "Spam" });
                    return conversation.status;
                  })()}
                </Chip>
              </span>
            </div>
            <div className="so-field">
              <span className="so-field__label">
                {intl.formatMessage({ id: "emailCrm.form.priority", defaultMessage: "Priority" })}
              </span>
              <span className="so-field__value">
                <Chip tone={PRIORITY_TONE[conversation.priority] ?? "neutral"} size="sm">
                  {(() => {
                    const p = conversation.priority.toUpperCase();
                    if (p === "LOW") return intl.formatMessage({ id: "emailCrm.index.priority_low", defaultMessage: "Low" });
                    if (p === "NORMAL") return intl.formatMessage({ id: "emailCrm.index.priority_normal", defaultMessage: "Normal" });
                    if (p === "HIGH") return intl.formatMessage({ id: "emailCrm.index.priority_high", defaultMessage: "High" });
                    if (p === "URGENT") return intl.formatMessage({ id: "emailCrm.index.priority_urgent", defaultMessage: "Urgent" });
                    return conversation.priority;
                  })()}
                </Chip>
              </span>
            </div>
            <div className="so-field">
              <span className="so-field__label">
                {intl.formatMessage({ id: "emailCrm.form.customer", defaultMessage: "Customer" })}
              </span>
              <span className="so-field__value">
                {conversation.customer ? (
                  <button
                    type="button"
                    className="so-btn so-btn--ghost so-btn--sm"
                    onClick={() => navigate(`/customer/${conversation.customer!.id}`)}
                  >
                    {conversation.customer.name}
                    {conversation.customer.code ? ` (${conversation.customer.code})` : ""}
                  </button>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div className="so-field">
              <span className="so-field__label">
                {intl.formatMessage({ id: "emailCrm.form.tags", defaultMessage: "Tags" })}
              </span>
              <span className="so-field__value">{tagsToLabel(conversation.tags)}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">
                {intl.formatMessage({ id: "emailCrm.index.col_last_message", defaultMessage: "Last message" })}
              </span>
              <span className="so-field__value">{formatDateTime(conversation.lastMessageAt)}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">
                {intl.formatMessage({ id: "emailCrm.detail.agent_status", defaultMessage: "Agent" })}
              </span>
              <span className="so-field__value">
                <Chip tone={AGENT_TONE[agentStatus] ?? "neutral"} size="sm">
                  {agentRunning
                    ? intl.formatMessage({ id: "emailCrm.detail.agent_running", defaultMessage: "Agent is running…" })
                    : agentStatus === "FAILED"
                      ? intl.formatMessage({ id: "emailCrm.detail.agent_failed", defaultMessage: "Agent failed" })
                      : agentStatus}
                </Chip>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="so-card">
        <div className="so-card__header">
          <h2 className="so-card__title">
            <span className="so-card__icon">
              <EmailCrmIcon name="clock" size={14} />
            </span>
            {intl.formatMessage({ id: "emailCrm.detail.messages_title", defaultMessage: "Messages" })}
          </h2>
          <p className="so-card__hint">{conversation.messages?.length ?? 0}</p>
        </div>
        <div className="so-card__body">
          {(conversation.messages?.length ?? 0) === 0 ? (
            <p style={{ margin: 0, color: "var(--ios-label-2)" }}>
              {intl.formatMessage({ id: "emailCrm.detail.no_messages", defaultMessage: "No messages yet" })}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {conversation.messages.map((msg) => {
                const inbound = msg.direction === "INBOUND";
                // INBOUND: always plain body (never HTML). OUTBOUND: strict sanitize or fall back to body.
                const outboundHtml =
                  !inbound && msg.htmlBody?.trim()
                    ? sanitizeOutboundHtml(msg.htmlBody)
                    : null;
                return (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: inbound ? "flex-start" : "flex-end",
                      maxWidth: "85%",
                      border: "1px solid var(--ios-separator, #E5E5EA)",
                      borderRadius: 12,
                      padding: "10px 12px",
                      background: inbound ? "var(--ios-bg-secondary, #F2F2F7)" : "var(--ios-fill-blue, #E8F1FF)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                      <span className="m-badge">
                        {msg.direction}
                        {msg.sendStatus ? ` · ${msg.sendStatus}` : ""}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--ios-label-2)" }}>
                        {formatDateTime(msg.sentAt ?? msg.createdAt)}
                      </span>
                    </div>
                    {outboundHtml ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: outboundHtml }}
                        style={{ margin: 0, wordBreak: "break-word" }}
                      />
                    ) : (
                      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.body}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {canUpdate && (
        <section className="so-card">
          <div className="so-card__header">
            <h2 className="so-card__title">
              <span className="so-card__icon">
                <EmailCrmIcon name="sparkle" size={14} />
              </span>
              {intl.formatMessage({ id: "emailCrm.detail.compose_title", defaultMessage: "Compose reply" })}
            </h2>
          </div>
          <div className="so-card__body">
            <div className="so-section">
              <div className="so-field">
                <label className="so-field__label" htmlFor="email-crm-ai-instruction">
                  {intl.formatMessage({
                    id: "emailCrm.detail.ai_instruction",
                    defaultMessage: "AI instruction (optional)",
                  })}
                </label>
                <input
                  id="email-crm-ai-instruction"
                  className="so-field__input"
                  type="text"
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder={intl.formatMessage({
                    id: "emailCrm.detail.ai_instruction_placeholder",
                    defaultMessage: "e.g. polite, confirm stock, ask for outlet",
                  })}
                  disabled={busy}
                />
              </div>
              <div className="so-field">
                <label className="so-field__label" htmlFor="email-crm-compose">
                  {intl.formatMessage({ id: "emailCrm.detail.compose_label", defaultMessage: "Reply body" })}
                </label>
                <textarea
                  id="email-crm-compose"
                  className="so-field__input"
                  rows={6}
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder={intl.formatMessage({
                    id: "emailCrm.detail.compose_placeholder",
                    defaultMessage: "Write a reply…",
                  })}
                  disabled={busy}
                />
              </div>
            </div>
            <div className="so-actions" style={{ marginTop: 12 }}>
              <ButtonGroup
                items={[
                  {
                    key: "suggest",
                    label: intl.formatMessage({
                      id: "emailCrm.detail.suggest_reply",
                      defaultMessage: "AI Suggest",
                    }),
                    icon: <EmailCrmIcon name="sparkle" size={14} />,
                    onClick: () => suggestMutation.mutate(),
                    disabled: busy,
                    isLoading: suggestMutation.isPending,
                    variant: "default",
                  },
                  {
                    key: "send",
                    label: intl.formatMessage({ id: "emailCrm.detail.send_reply", defaultMessage: "Send" }),
                    icon: <EmailCrmIcon name="check" size={14} />,
                    onClick: () => {
                      const body = composeBody.trim();
                      if (!body) {
                        toast.error(
                          intl.formatMessage({
                            id: "emailCrm.detail.reply_required",
                            defaultMessage: "Reply body is required",
                          }),
                        );
                        return;
                      }
                      sendReplyMutation.mutate(body);
                    },
                    disabled: busy || !composeBody.trim(),
                    isLoading: sendReplyMutation.isPending,
                    variant: "primary",
                  },
                ]}
              />
            </div>
          </div>
        </section>
      )}

      <section className="so-card">
        <div className="so-card__header">
          <h2 className="so-card__title">
            <span className="so-card__icon">
              <EmailCrmIcon name="user" size={14} />
            </span>
            {intl.formatMessage({ id: "emailCrm.detail.linked_orders", defaultMessage: "Linked sales orders" })}
          </h2>
          <p className="so-card__hint">{conversation.salesOrders?.length ?? 0}</p>
        </div>
        <div className="so-card__body" style={{ padding: 0 }}>
          {(conversation.salesOrders?.length ?? 0) === 0 ? (
            <div className="so-card__body" style={{ textAlign: "center", padding: "2rem" }}>
              <p style={{ margin: 0, color: "var(--ios-label-2)" }}>
                {intl.formatMessage({
                  id: "emailCrm.detail.no_orders",
                  defaultMessage: "No linked sales orders",
                })}
              </p>
            </div>
          ) : (
            <div className="so-items-table so-items-table--compact">
              <div className="so-items-table__body">
                {conversation.salesOrders.map((order) => (
                  <div
                    key={order.id}
                    className="so-items-table__row"
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/sales-order/${order.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/sales-order/${order.id}`);
                      }
                    }}
                  >
                    <div className="so-items-table__td so-items-table__td--product">
                      <span className="so-items-table__icon" data-tint="blue" aria-hidden="true">
                        <EmailCrmIcon name="inbox" size={16} />
                      </span>
                      <div className="so-items-table__product">
                        <span className="so-items-table__product-name">
                          {order.documentNumber ?? order.id}
                        </span>
                        <span className="so-items-table__product-code">
                          {intl.formatMessage({
                            id: "emailCrm.detail.open_order",
                            defaultMessage: "Open order",
                          })}{" "}
                          · {order.approvalStatus} · {formatDateTime(order.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="so-items-table__td so-items-table__td--num so-items-table__td--muted">
                      <EmailCrmIcon name="chevron-right" size={16} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {deleteModalOpen &&
        createPortal(
          <div className="so-modal__backdrop" onClick={() => !isDeleting && setDeleteModalOpen(false)}>
            <div className="so-modal" onClick={(e) => e.stopPropagation()}>
              <div className="so-modal__header">
                <h3>
                  <EmailCrmIcon name="delete" size={16} />{" "}
                  {intl.formatMessage({ id: "emailCrm.common.delete", defaultMessage: "Delete conversation" })}
                </h3>
                <button
                  className="so-btn so-btn--ghost so-btn--sm"
                  onClick={() => setDeleteModalOpen(false)}
                  aria-label="Close"
                >
                  <EmailCrmIcon name="close" size={14} />
                </button>
              </div>
              <div className="so-modal__body">
                <div className="so-modal__icon so-modal__icon--error">
                  <EmailCrmIcon name="delete" size={28} />
                </div>
                <h3 className="so-modal__title">
                  {intl.formatMessage({ id: "emailCrm.detail.delete_confirm_title", defaultMessage: "Are you sure?" })}
                </h3>
                <p className="so-modal__msg">
                  {intl.formatMessage(
                    {
                      id: "emailCrm.common.delete_confirm",
                      defaultMessage: 'Delete conversation with "{email}"? This action cannot be undone.',
                    },
                    { email: conversation.email },
                  )}
                </p>
              </div>
              <div className="so-modal__footer">
                <button className="so-btn so-btn--ghost" onClick={() => setDeleteModalOpen(false)}>
                  {intl.formatMessage({ id: "emailCrm.common.cancel", defaultMessage: "Cancel" })}
                </button>
                <button className="so-btn so-btn--danger" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting && <span className="so-spinner" />}
                  <EmailCrmIcon name="delete" size={14} />
                  {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
};
