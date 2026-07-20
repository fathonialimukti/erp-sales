import { useState } from "react";
import { createPortal } from "react-dom";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { ButtonGroup } from "../../components/ButtonGroup";
import { Spinner } from "../../ui/Spinner";
import { useToast } from "../../ui/useToast";
import { EmailCrmIcon } from "./EmailCrmIcons";

type EmailMessage = {
  id: string;
  direction: string;
  body: string;
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
  });

  const conversation = data as EmailCrmDetail | undefined;

  const invalidateDetail = async () => {
    await queryClient.invalidateQueries({ queryKey: ["emailCrmDetail", id] });
    await queryClient.invalidateQueries({ queryKey: ["emailCrmList"] });
  };

  const saveReplyMutation = useMutation({
    mutationFn: (body: string) =>
      trpcClient.emailCrm.createMessage.mutate({
        conversationId: id ?? "",
        body,
        direction: "OUTBOUND",
      }),
    onSuccess: async () => {
      setComposeBody("");
      await invalidateDetail();
      toast.success(
        intl.formatMessage({ id: "emailCrm.detail.reply_saved", defaultMessage: "Reply saved" }),
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save reply"),
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

  const busy = saveReplyMutation.isPending || suggestMutation.isPending;

  return (
    <section
      className="so-page"
      data-ai-context={JSON.stringify({
        section: "email-crm-detail",
        id: conversation.id,
        email: conversation.email,
        status: conversation.status,
        priority: conversation.priority,
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
              <span className="so-field__value">{conversation.status}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">
                {intl.formatMessage({ id: "emailCrm.form.priority", defaultMessage: "Priority" })}
              </span>
              <span className="so-field__value">{conversation.priority}</span>
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
                      <span className="m-badge">{msg.direction}</span>
                      <span style={{ fontSize: 12, color: "var(--ios-label-2)" }}>
                        {formatDateTime(msg.createdAt)}
                      </span>
                    </div>
                    <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.body}</p>
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
                    key: "save",
                    label: intl.formatMessage({ id: "emailCrm.detail.save_reply", defaultMessage: "Save reply" }),
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
                      saveReplyMutation.mutate(body);
                    },
                    disabled: busy || !composeBody.trim(),
                    isLoading: saveReplyMutation.isPending,
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
            <div className="so-items-table">
              <div className="so-items-table__body">
                {conversation.salesOrders.map((order) => (
                  <div
                    key={order.id}
                    className="so-items-table__row"
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/sales-order/${order.id}`)}
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
                          {order.approvalStatus} · {formatDateTime(order.createdAt)}
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
