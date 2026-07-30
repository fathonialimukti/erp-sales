import { useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChevronRight,
  FileText,
  Loader2,
  Package,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { PageHeader } from "../../components/PageHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type EventProposalDetail = {
  id: string;
  documentNumber: string | null;
  name: string;
  type: string;
  venue: string | null;
  eventDate: string | null;
  eventEndDate: string | null;
  proposedBudget: number | null;
  currency: string;
  status: string;
  description: string | null;
  area: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  skus: { id: string; sku: { id: string; name: string; code: string | null } }[];
};

export const EventProposalDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("eventProposal@update");
  const canDelete = hasPermission("eventProposal@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftResult, setDraftResult] = useState("");
  const [draftError, setDraftError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["eventProposalDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.eventProposal.detail.query({ id: id ?? "" }),
  });

  const eventProposal = data as EventProposalDetail | undefined;

  const handleDraftFollowUp = async () => {
    if (!eventProposal) return;
    setDraftModalOpen(true);
    setDraftLoading(true);
    setDraftResult("");
    setDraftError("");

    const contextData = {
      section: "event-proposal-detail",
      id: eventProposal.id,
      name: eventProposal.name,
      skuCount: eventProposal.skus?.length ?? 0,
    };

    try {
      const res = await fetch("http://localhost:10022/api/ai/draft", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: contextData.section,
          contextJson: JSON.stringify(contextData),
          kind: "followup",
        }),
      });

      if (!res.ok) throw new Error("Draft failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setDraftResult(accumulated);
      }
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setDraftLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!eventProposal || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.eventProposal.delete.mutate({ id: eventProposal.id });
      await queryClient.invalidateQueries({ queryKey: ["eventProposalList"] });
      setDeleteModalOpen(false);
      toast.success(
        intl.formatMessage({
          id: "event_proposal.detail.delete_success",
          defaultMessage: "Region deleted",
        }),
      );
      navigate("/eventProposal");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "eventProposal-detail", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </section>
    );
  }

  if (!eventProposal) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "eventProposal-detail", notFound: true })}
      >
        <div className="flex flex-col gap-3">
          <NavButtonGroup className="self-end" onBack={() => navigate("/eventProposal")} />
          <PageHeader
            module="event"
            title={intl.formatMessage({
              id: "event_proposal.detail.not_found",
              defaultMessage: "Region not found",
            })}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "eventProposal-detail",
        id: eventProposal.id,
        name: eventProposal.name,
        areaCount: eventProposal.skus?.length ?? 0,
      })}
    >
      <div className="flex flex-col gap-3">
        <NavButtonGroup className="self-end" onBack={() => navigate("/eventProposal")}>
          {canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/eventProposal/${eventProposal.id}/edit`)}
              className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3.5" aria-hidden />
              {intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" })}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDraftFollowUp}
            className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="size-3.5" aria-hidden />
            {intl.formatMessage({
              id: "event_proposal.detail.draft_followup",
              defaultMessage: "Draft follow-up",
            })}
          </Button>
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
          module="event"
          eyebrow={intl.formatMessage({ id: "nav.programs", defaultMessage: "Programs" })}
          title={eventProposal.name}
          description={eventProposal.documentNumber ?? "—"}
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-event)_8%,transparent)] text-[var(--module-event)]">
              <FileText className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "event_proposal.detail.summary", defaultMessage: "Summary" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "event_proposal.detail.code_label",
                  defaultMessage: "Document",
                })}
              </dt>
              <dd className="font-mono text-sm text-foreground">
                {eventProposal.documentNumber ?? "—"}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "event_proposal.detail.name_label",
                  defaultMessage: "Name",
                })}
              </dt>
              <dd className="text-sm font-normal text-foreground">{eventProposal.name}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "event_proposal.detail.areas_label",
                  defaultMessage: "Payments",
                })}
              </dt>
              <dd className="text-sm font-normal tabular-nums text-foreground">
                {eventProposal.skus?.length ?? 0}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-sku)_8%,transparent)] text-[var(--module-sku)]">
              <Package className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({
              id: "event_proposal.detail.payments_title",
              defaultMessage: "Payments",
            })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage(
              {
                id: "event_proposal.detail.skus_count",
                defaultMessage: "{count, plural, one {# SKU} other {# SKUs}}",
              },
              { count: eventProposal.skus?.length ?? 0 },
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {(eventProposal.skus?.length ?? 0) === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "event_proposal.detail.no_payments",
                defaultMessage: "No SKUs yet",
              })}
            </p>
          ) : (
            <ul className="divide-y">
              {eventProposal.skus?.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/sku/${row.sku.id}`)}
                    className="flex w-full cursor-pointer items-center gap-3 px-6 py-3 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-sku)_8%,transparent)] text-[var(--module-sku)]">
                      <Package className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {row.sku.name}
                      </span>
                      {row.sku.code ? (
                        <span className="block font-mono text-xs text-foreground">
                          {row.sku.code}
                        </span>
                      ) : null}
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
          id: "event_proposal.detail.delete_title",
          defaultMessage: "Delete eventProposal",
        })}
        description={intl.formatMessage(
          {
            id: "event_proposal.index.delete_confirm_body",
            defaultMessage: 'Delete "{name}"? This action cannot be undone.',
          },
          { name: eventProposal.name },
        )}
        confirmLabel={intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />

      <Dialog open={draftModalOpen} onOpenChange={setDraftModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {intl.formatMessage({
                id: "event_proposal.detail.draft_followup",
                defaultMessage: "Draft follow-up",
              })}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {intl.formatMessage({
                id: "event_proposal.detail.draft_followup",
                defaultMessage: "Draft follow-up",
              })}
            </DialogDescription>
          </DialogHeader>
          {draftLoading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            </div>
          ) : null}
          {draftError ? <p className="text-sm text-destructive">{draftError}</p> : null}
          {draftResult ? (
            <div className="text-foreground text-sm font-semibold">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{draftResult}</ReactMarkdown>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
};
