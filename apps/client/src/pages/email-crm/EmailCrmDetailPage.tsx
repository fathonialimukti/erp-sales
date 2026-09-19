import { useRef, useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  ChevronRight,
  Inbox,
  Loader2,
  MessageSquare,
  Paperclip,
  Pencil,
  SearchX,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { isAcceptableImage } from "@/lib/attach-limits";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { EmptyState } from "../../components/EmptyState";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { PageHeader } from "../../components/PageHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { StatusChip } from "../../components/StatusChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useGeneralSettings } from "@/hooks/useGeneralSettings";

type AgentStatus = "IDLE" | "RUNNING" | "SENT" | "FAILED" | string;

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

const MAX_ATTACH_IMAGES = 4;

/**
 * tRPC wire code (`error.data.code`: NOT_FOUND / FORBIDDEN / …).
 * Missing → undefined (treated as generic failure).
 */
export const getEmailCrmDetailErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return undefined;
  }
  const data = (error as { data?: unknown }).data;
  if (typeof data !== "object" || data === null || !("code" in data)) {
    return undefined;
  }
  const code = (data as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
};

/**
 * Never retry terminal id/permission failures — they would only delay the
 * error state (looks like an infinite skeleton). Retry transient failures
 * at most twice; the tRPC `retryLink` already skips non-5xx.
 */
export const shouldRetryEmailCrmDetail = (failureCount: number, error: unknown): boolean => {
  const code = getEmailCrmDetailErrorCode(error);
  if (
    code === "NOT_FOUND" ||
    code === "BAD_REQUEST" ||
    code === "FORBIDDEN" ||
    code === "UNAUTHORIZED"
  ) {
    return false;
  }
  return failureCount < 2;
};

export type EmailCrmDetailErrorState = "not-found" | "forbidden" | "load-failed";

/** Maps a tRPC wire code to the error state the detail page renders. */
export const resolveEmailCrmDetailErrorState = (
  code: string | undefined,
): EmailCrmDetailErrorState => {
  if (code === "NOT_FOUND" || code === "BAD_REQUEST") return "not-found";
  if (code === "FORBIDDEN" || code === "UNAUTHORIZED") return "forbidden";
  return "load-failed";
};

interface DetailErrorStateProps {
  id?: string;
  state: "missing-id" | "not-found" | "forbidden" | "load-failed";
  code?: string;
  isRetrying: boolean;
  onBack: () => void;
  onRetry: () => void;
}

const DetailErrorState = ({ id, state, code, isRetrying, onBack, onRetry }: DetailErrorStateProps) => {
  const intl = useIntl();
  const eyebrow = intl.formatMessage({
    id: "emailCrm.detail.title",
    defaultMessage: "Email conversation",
  });
  const backLabel = intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" });
  const retryLabel = intl.formatMessage({ id: "common.action.retry", defaultMessage: "Retry" });

  const copy =
    state === "not-found" || state === "missing-id"
      ? {
          title: intl.formatMessage({
            id: "emailCrm.detail.not_found",
            defaultMessage: "Conversation not found",
          }),
          description:
            state === "missing-id"
              ? intl.formatMessage({
                  id: "emailCrm.detail.missing_id_description",
                  defaultMessage: "No conversation id was provided in the URL.",
                })
              : intl.formatMessage({
                  id: "emailCrm.detail.not_found_description",
                  defaultMessage:
                    "It may have been deleted or the link is incorrect. Check the id and try again.",
                }),
          icon: <SearchX className="size-6" aria-hidden />,
        }
      : state === "forbidden"
        ? {
            title: intl.formatMessage({
              id: "emailCrm.detail.forbidden",
              defaultMessage: "Access denied",
            }),
            description: intl.formatMessage({
              id: "emailCrm.detail.forbidden_description",
              defaultMessage: "You don't have permission to view this conversation.",
            }),
            icon: <ShieldAlert className="size-6" aria-hidden />,
          }
        : {
            title: intl.formatMessage({
              id: "emailCrm.detail.load_failed",
              defaultMessage: "Failed to load conversation",
            }),
            description: intl.formatMessage({
              id: "emailCrm.detail.load_failed_description",
              defaultMessage: "Something went wrong. Please try again.",
            }),
            icon: <AlertTriangle className="size-6" aria-hidden />,
          };

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({ section: "email-crm-detail", state, id, code })}
    >
      <div className="flex flex-col gap-3">
        <NavButtonGroup className="self-end" onBack={onBack} />
        <PageHeader module="email" eyebrow={eyebrow} title={copy.title} description={copy.description} />
      </div>
      <EmptyState
        module="email"
        icon={copy.icon}
        title={copy.title}
        description={copy.description}
        action={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" variant="outline" onClick={onBack} className="min-h-[44px]">
              {backLabel}
            </Button>
            {state === "load-failed" ? (
              <Button
                type="button"
                onClick={onRetry}
                disabled={isRetrying}
                className="min-h-[44px]"
              >
                {isRetrying ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {retryLabel}
              </Button>
            ) : null}
          </div>
        }
      />
    </section>
  );
};

type PendingImage = { filename?: string; mediaType: string; url: string };

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });

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
  const { multimodalEnabled } = useGeneralSettings();
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["emailCrmDetail", id],
    enabled: Boolean(id),
    retry: shouldRetryEmailCrmDetail,
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
      setPendingImages([]);
      setAttachError(null);
      await invalidateDetail();
      toast.success(
        intl.formatMessage({ id: "emailCrm.detail.reply_sent", defaultMessage: "Reply sent" }),
      );
    },
    onError: (e) => toast.error(e, "Failed to send reply"),
  });

  const suggestMutation = useMutation({
    mutationFn: () =>
      trpcClient.emailCrm.suggestReply.mutate({
        conversationId: id ?? "",
        instruction: aiInstruction.trim() || undefined,
        save: false,
        images: pendingImages.length > 0 ? pendingImages : undefined,
      }),
    onSuccess: (result) => {
      setComposeBody(result.draft ?? "");
      setPendingImages([]);
      setAttachError(null);
      toast.success(
        intl.formatMessage({
          id: "emailCrm.detail.suggest_ready",
          defaultMessage: "Suggestion ready",
        }),
      );
    },
    onError: (e) => toast.error(e, "Failed to suggest reply"),
  });

  const retryAgentMutation = useMutation({
    mutationFn: () =>
      trpcClient.emailCrm.retryAgent.mutate({
        conversationId: id ?? "",
      }),
    onSuccess: async () => {
      await invalidateDetail();
      toast.success(
        intl.formatMessage({
          id: "emailCrm.detail.agent_running",
          defaultMessage: "Agent is running…",
        }),
      );
    },
    onError: (e) => toast.error(e, "Failed to retry agent"),
  });

  const attachErrorMessage = intl.formatMessage({
    id: "emailCrm.detail.attach_error",
    defaultMessage: "Images only, max 5 MB each, up to 4 images.",
  });

  const processImageFiles = async (files: File[]) => {
    let skippedCount = 0;
    const accepted: File[] = [];
    for (const file of files) {
      if (isAcceptableImage(file)) {
        if (pendingImages.length + accepted.length >= MAX_ATTACH_IMAGES) {
          skippedCount += 1;
        } else {
          accepted.push(file);
        }
      } else {
        skippedCount += 1;
      }
    }
    setAttachError(skippedCount > 0 ? attachErrorMessage : null);

    const newImages: PendingImage[] = [];
    for (const file of accepted) {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        newImages.push({ filename: file.name, mediaType: file.type, url: dataUrl });
      } catch {
        setAttachError(attachErrorMessage);
      }
    }
    if (newImages.length > 0) {
      setPendingImages((prev) => [...prev, ...newImages].slice(0, MAX_ATTACH_IMAGES));
    }
  };

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!multimodalEnabled) return;
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    await processImageFiles(files);
  };

  const handleDelete = async () => {
    if (!conversation || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.emailCrm.delete.mutate({ id: conversation.id });
      await queryClient.invalidateQueries({ queryKey: ["emailCrmList"] });
      setDeleteModalOpen(false);
      toast.success(
        intl.formatMessage({
          id: "emailCrm.detail.delete_success",
          defaultMessage: "Conversation deleted",
        }),
      );
      navigate("/email-crm");
    } catch (e) {
      toast.error(e, "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  const statusLabel = (status: string) => {
    const s = status.toUpperCase();
    if (s === "OPEN")
      return intl.formatMessage({ id: "emailCrm.index.status_open", defaultMessage: "Open" });
    if (s === "PENDING")
      return intl.formatMessage({
        id: "emailCrm.index.status_pending",
        defaultMessage: "Pending",
      });
    if (s === "RESOLVED")
      return intl.formatMessage({
        id: "emailCrm.index.status_resolved",
        defaultMessage: "Resolved",
      });
    if (s === "SPAM")
      return intl.formatMessage({ id: "emailCrm.index.status_spam", defaultMessage: "Spam" });
    return status;
  };

  const priorityLabel = (priority: string) => {
    const p = priority.toUpperCase();
    if (p === "LOW")
      return intl.formatMessage({ id: "emailCrm.index.priority_low", defaultMessage: "Low" });
    if (p === "NORMAL")
      return intl.formatMessage({
        id: "emailCrm.index.priority_normal",
        defaultMessage: "Normal",
      });
    if (p === "HIGH")
      return intl.formatMessage({ id: "emailCrm.index.priority_high", defaultMessage: "High" });
    if (p === "URGENT")
      return intl.formatMessage({
        id: "emailCrm.index.priority_urgent",
        defaultMessage: "Urgent",
      });
    return priority;
  };

  if (!id) {
    return (
      <DetailErrorState
        state="missing-id"
        onBack={() => navigate("/email-crm")}
        onRetry={() => {}}
        isRetrying={false}
      />
    );
  }

  if (isLoading) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "email-crm-detail", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </section>
    );
  }

  if (isError) {
    const code = getEmailCrmDetailErrorCode(error);
    const state = resolveEmailCrmDetailErrorState(code);
    return (
      <DetailErrorState
        id={id}
        state={state}
        code={code}
        isRetrying={isFetching}
        onBack={() => navigate("/email-crm")}
        onRetry={() => void refetch()}
      />
    );
  }

  if (!conversation) {
    return (
      <DetailErrorState
        id={id}
        state="not-found"
        onBack={() => navigate("/email-crm")}
        onRetry={() => void refetch()}
        isRetrying={false}
      />
    );
  }

  const agentStatus = conversation.agentStatus ?? "IDLE";
  const agentRunning = agentStatus === "RUNNING";
  const busy =
    sendReplyMutation.isPending ||
    suggestMutation.isPending ||
    retryAgentMutation.isPending ||
    agentRunning;

  const agentLabel = agentRunning
    ? intl.formatMessage({
        id: "emailCrm.detail.agent_running",
        defaultMessage: "Agent is running…",
      })
    : agentStatus === "FAILED"
      ? intl.formatMessage({
          id: "emailCrm.detail.agent_failed",
          defaultMessage: "Agent failed",
        })
      : agentStatus;

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
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
      <div className="flex flex-col gap-3">
        <NavButtonGroup className="self-end" onBack={() => navigate("/email-crm")}>
          {canUpdate && agentStatus === "FAILED" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => retryAgentMutation.mutate()}
              disabled={retryAgentMutation.isPending}
              className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
            >
              {retryAgentMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-3.5" aria-hidden />
              )}
              {intl.formatMessage({
                id: "emailCrm.detail.retry_agent",
                defaultMessage: "Retry agent",
              })}
            </Button>
          ) : null}
          {canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/email-crm/${conversation.id}/edit`)}
              className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3.5" aria-hidden />
              {intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" })}
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteModalOpen(true)}
              className="h-8 gap-1.5 px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" aria-hidden />
              {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
            </Button>
          ) : null}
        </NavButtonGroup>

        <PageHeader
          module="email"
          eyebrow={intl.formatMessage({
            id: "emailCrm.detail.title",
            defaultMessage: "Email conversation",
          })}
          title={conversation.subject ?? conversation.email}
          description={conversation.email}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={conversation.status} label={statusLabel(conversation.status)} />
        <StatusChip status={conversation.priority} label={priorityLabel(conversation.priority)} />
        <StatusChip
          status={agentStatus}
          label={`${intl.formatMessage({
            id: "emailCrm.detail.agent_status",
            defaultMessage: "Agent",
          })}: ${agentLabel}`}
        />
      </div>
      {agentStatus === "FAILED" && conversation.agentError ? (
        <p className="text-sm text-destructive">{conversation.agentError}</p>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-email)_8%,transparent)] text-module-email">
              <Inbox className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "emailCrm.detail.summary", defaultMessage: "Summary" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "emailCrm.form.email", defaultMessage: "Email" })}
              </dt>
              <dd className="font-mono text-sm text-foreground">{conversation.email}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "emailCrm.form.subject", defaultMessage: "Subject" })}
              </dt>
              <dd className="text-sm font-normal text-foreground">{conversation.subject ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "emailCrm.form.customer", defaultMessage: "Customer" })}
              </dt>
              <dd className="text-sm font-normal text-foreground">
                {conversation.customer ? (
                  <button
                    type="button"
                    className="cursor-pointer text-primary underline-offset-2 hover:underline"
                    onClick={() => navigate(`/customer/${conversation.customer!.id}`)}
                  >
                    {conversation.customer.name}
                    {conversation.customer.code ? ` (${conversation.customer.code})` : ""}
                  </button>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "emailCrm.form.tags", defaultMessage: "Tags" })}
              </dt>
              <dd className="text-sm font-normal text-foreground">{tagsToLabel(conversation.tags)}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "emailCrm.index.col_last_message",
                  defaultMessage: "Last message",
                })}
              </dt>
              <dd className="text-sm font-normal text-foreground">
                {formatDateTime(conversation.lastMessageAt)}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "emailCrm.detail.agent_status", defaultMessage: "Agent" })}
              </dt>
              <dd className="flex items-center gap-2 text-sm font-normal text-foreground">
                {agentRunning ? (
                  <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden />
                ) : (
                  <Bot className="size-3.5 text-muted-foreground" aria-hidden />
                )}
                {agentLabel}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-email)_8%,transparent)] text-module-email">
              <MessageSquare className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({
              id: "emailCrm.detail.messages_title",
              defaultMessage: "Messages",
            })}
          </CardTitle>
          <CardDescription>{conversation.messages?.length ?? 0}</CardDescription>
        </CardHeader>
        <CardContent>
          {(conversation.messages?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "emailCrm.detail.no_messages",
                defaultMessage: "No messages yet",
              })}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {conversation.messages.map((msg) => {
                const inbound = msg.direction === "INBOUND";
                const outboundHtml =
                  !inbound && msg.htmlBody?.trim()
                    ? sanitizeOutboundHtml(msg.htmlBody)
                    : null;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "max-w-[85%] rounded-xl border px-3 py-2.5",
                      inbound
                        ? "self-start bg-card"
                        : "self-end border-[color-mix(in_srgb,var(--module-email)_30%,transparent)] bg-[color-mix(in_srgb,var(--module-email)_8%,transparent)]",
                    )}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {msg.direction}
                        {msg.sendStatus ? ` · ${msg.sendStatus}` : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(msg.sentAt ?? msg.createdAt)}
                      </span>
                    </div>
                    {outboundHtml ? (
                      <div
                        className="text-foreground text-sm font-semibold"
                        dangerouslySetInnerHTML={{ __html: outboundHtml }}
                      />
                    ) : (
                      <p className="m-0 whitespace-pre-wrap text-sm font-semibold text-foreground">{msg.body}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {canUpdate ? (
        <Card
          className={cn("shadow-sm", isDragging && multimodalEnabled && "border-dashed")}
          onDragOver={(e) => {
            e.preventDefault();
            if (multimodalEnabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (!multimodalEnabled || busy) return;
            const files = Array.from(e.dataTransfer.files ?? []);
            if (files.length === 0) return;
            void processImageFiles(files);
          }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-ai)_8%,transparent)] text-module-ai">
                <Sparkles className="size-4" aria-hidden />
              </span>
              {intl.formatMessage({
                id: "emailCrm.detail.compose_title",
                defaultMessage: "Compose reply",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {attachError && <p className="text-xs text-destructive">{attachError}</p>}
            {multimodalEnabled && pendingImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pendingImages.map((image, imageIdx) => (
                  <div key={`${image.filename}-${imageIdx}`} className="relative">
                    <img
                      src={image.url}
                      alt={image.filename ?? "attachment"}
                      className="h-16 w-16 rounded-lg border border-border object-cover"
                    />
                    <button
                      type="button"
                      className="absolute -top-1.5 -right-1.5 inline-flex size-6 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() =>
                        setPendingImages((prev) => prev.filter((_, idx) => idx !== imageIdx))
                      }
                      aria-label={intl.formatMessage({
                        id: "emailCrm.detail.remove_image",
                        defaultMessage: "Remove image",
                      })}
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {multimodalEnabled && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                disabled={busy}
                onChange={handleAttach}
              />
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email-crm-ai-instruction">
                {intl.formatMessage({
                  id: "emailCrm.detail.ai_instruction",
                  defaultMessage: "AI instruction (optional)",
                })}
              </Label>
              <Input
                id="email-crm-ai-instruction"
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                placeholder={intl.formatMessage({
                  id: "emailCrm.detail.ai_instruction_placeholder",
                  defaultMessage: "e.g. polite, confirm stock, ask for outlet",
                })}
                disabled={busy}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email-crm-compose">
                {intl.formatMessage({
                  id: "emailCrm.detail.compose_label",
                  defaultMessage: "Reply body",
                })}
              </Label>
              <Textarea
                id="email-crm-compose"
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
            <div className="flex flex-wrap gap-2">
              {multimodalEnabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0 rounded-lg text-muted-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                  aria-label={intl.formatMessage({
                    id: "emailCrm.detail.attach_image",
                    defaultMessage: "Attach image",
                  })}
                >
                  <Paperclip className="size-4" aria-hidden />
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => suggestMutation.mutate()}
                disabled={busy}
              >
                {suggestMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {intl.formatMessage({
                  id: "emailCrm.detail.suggest_reply",
                  defaultMessage: "AI Suggest",
                })}
              </Button>
              <Button
                type="button"
                onClick={() => {
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
                }}
                disabled={busy || !composeBody.trim()}
              >
                {sendReplyMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {intl.formatMessage({ id: "emailCrm.detail.send_reply", defaultMessage: "Send" })}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-order)_8%,transparent)] text-module-order">
              <ShoppingCart className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({
              id: "emailCrm.detail.linked_orders",
              defaultMessage: "Linked sales orders",
            })}
          </CardTitle>
          <CardDescription>{conversation.salesOrders?.length ?? 0}</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {(conversation.salesOrders?.length ?? 0) === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "emailCrm.detail.no_orders",
                defaultMessage: "No linked sales orders",
              })}
            </p>
          ) : (
            <ul className="divide-y">
              {conversation.salesOrders.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/sales-order/${order.id}`)}
                    className="flex w-full cursor-pointer items-center gap-3 px-6 py-3 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-order)_8%,transparent)] text-module-order">
                      <ShoppingCart className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {order.documentNumber ?? order.id}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {intl.formatMessage({
                          id: "emailCrm.detail.open_order",
                          defaultMessage: "Open order",
                        })}{" "}
                        · {order.approvalStatus} · {formatDateTime(order.createdAt)}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={intl.formatMessage({
          id: "emailCrm.common.delete",
          defaultMessage: "Delete conversation",
        })}
        description={intl.formatMessage(
          {
            id: "emailCrm.common.delete_confirm",
            defaultMessage: 'Delete conversation with "{email}"? This action cannot be undone.',
          },
          { email: conversation.email },
        )}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </section>
  );
};
