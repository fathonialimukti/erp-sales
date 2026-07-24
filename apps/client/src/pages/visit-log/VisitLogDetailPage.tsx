import { useState } from "react";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChevronRight,
  ClipboardList,
  Loader2,
  MapPin,
  Pencil,
  ShoppingCart,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";

import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { useToast } from "../../components/useToast";
import { NavButtonGroup } from "../../components/NavButtonGroup";
import { PageHeader } from "../../components/PageHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { StatusChip } from "../../components/StatusChip";
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

type VisitLogDetail = {
  id: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  approvalStatus: string;
  purpose: string | null;
  notes: string | null;
  feedback: string | null;
  salesman: { id: string; name: string } | null;
  outlet: {
    id: string;
    name: string;
    customer: { id: string; name: string } | null;
    area: { id: string; name: string } | null;
  } | null;
  salesOrder: { id: string; documentNumber: string | null; grandTotal: number | null } | null;
};

export const VisitLogDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("visitLog@update");
  const canDelete = hasPermission("visitLog@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftResult, setDraftResult] = useState("");
  const [draftError, setDraftError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["visitLogDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.visitLog.detail.query({ id: id ?? "" }),
  });

  const visitLog = data as VisitLogDetail | undefined;

  const handleDraftFollowUp = async () => {
    if (!visitLog) return;
    setDraftModalOpen(true);
    setDraftLoading(true);
    setDraftResult("");
    setDraftError("");

    const contextData = {
      section: "visit-log-detail",
      id: visitLog.id,
      outlet: visitLog.outlet?.name,
      date: visitLog.date,
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
    if (!visitLog || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.visitLog.delete.mutate({ id: visitLog.id });
      await queryClient.invalidateQueries({ queryKey: ["visitLogList"] });
      setDeleteModalOpen(false);
      toast.success(
        intl.formatMessage({
          id: "visit_log.detail.delete_success",
          defaultMessage: "Region deleted",
        }),
      );
      navigate("/visitLog");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  const statusLabel = (status: string) => {
    const s = status.toUpperCase();
    if (s === "DRAFT")
      return intl.formatMessage({ id: "visit_log.index.status_draft", defaultMessage: "Draft" });
    if (s === "VALIDATING")
      return intl.formatMessage({
        id: "visit_log.index.status_validating",
        defaultMessage: "AI Processing",
      });
    if (s === "PROPOSED")
      return intl.formatMessage({
        id: "visit_log.index.status_proposed",
        defaultMessage: "Pending Approval",
      });
    if (s === "APPROVED")
      return intl.formatMessage({
        id: "visit_log.index.status_approved",
        defaultMessage: "Approved",
      });
    if (s === "REJECTED")
      return intl.formatMessage({
        id: "visit_log.index.status_rejected",
        defaultMessage: "Rejected",
      });
    return status;
  };

  if (isLoading) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "visitLog-detail", loading: true })}
      >
        <Skeleton className="h-16 w-full max-w-xl" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </section>
    );
  }

  if (!visitLog) {
    return (
      <section
        className="flex flex-col gap-6 pt-2 pb-8"
        data-ai-context={JSON.stringify({ section: "visitLog-detail", notFound: true })}
      >
        <div className="flex flex-col gap-3">
          <NavButtonGroup className="self-end" onBack={() => navigate("/visitLog")} />
          <PageHeader
            module="visit"
            title={intl.formatMessage({
              id: "visit_log.detail.not_found",
              defaultMessage: "Region not found",
            })}
          />
        </div>
      </section>
    );
  }

  const title =
    visitLog.outlet?.name ??
    intl.formatMessage({ id: "visit_log.detail.unnamed", defaultMessage: "Visit Log" });

  return (
    <section
      className="flex flex-col gap-6 pt-2 pb-8"
      data-ai-context={JSON.stringify({
        section: "visitLog-detail",
        id: visitLog.id,
        name: title,
        outletId: visitLog.outlet?.id,
        approvalStatus: visitLog.approvalStatus,
      })}
    >
      <div className="flex flex-col gap-3">
        <NavButtonGroup className="self-end" onBack={() => navigate("/visitLog")}>
          {canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/visitLog/${visitLog.id}/edit`)}
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
              id: "visit_log.detail.draft_followup",
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
          module="visit"
          eyebrow={intl.formatMessage({ id: "nav.field_ops", defaultMessage: "Field Operations" })}
          title={title}
          description={visitLog.outlet?.customer?.name ?? "—"}
        />
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-visit)_14%,transparent)] text-[var(--module-visit)]">
              <ClipboardList className="size-4" aria-hidden />
            </span>
            {intl.formatMessage({ id: "visit_log.detail.summary", defaultMessage: "Summary" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({ id: "visit_log.detail.date_label", defaultMessage: "Date" })}
              </dt>
              <dd className="text-sm text-foreground">{visitLog.date}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "visit_log.detail.status_label",
                  defaultMessage: "Status",
                })}
              </dt>
              <dd>
                <StatusChip
                  status={visitLog.approvalStatus}
                  label={statusLabel(visitLog.approvalStatus)}
                />
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "visit_log.detail.salesman_label",
                  defaultMessage: "Salesman",
                })}
              </dt>
              <dd className="flex items-center gap-2 text-sm text-foreground">
                <UserRound className="size-3.5 text-muted-foreground" aria-hidden />
                {visitLog.salesman?.name ?? "—"}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "visit_log.detail.outlet_label",
                  defaultMessage: "Outlet",
                })}
              </dt>
              <dd className="flex items-center gap-2 text-sm text-foreground">
                <MapPin className="size-3.5 text-muted-foreground" aria-hidden />
                {visitLog.outlet?.name ?? "—"}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "visit_log.detail.purpose_label",
                  defaultMessage: "Purpose",
                })}
              </dt>
              <dd className="text-sm text-foreground">{visitLog.purpose ?? "—"}</dd>
            </div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {intl.formatMessage({
                  id: "visit_log.detail.notes_label",
                  defaultMessage: "Notes",
                })}
              </dt>
              <dd className="text-sm text-foreground whitespace-pre-wrap">
                {visitLog.notes ?? "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {visitLog.salesOrder ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-base">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-order)_14%,transparent)] text-[var(--module-order)]">
                <ShoppingCart className="size-4" aria-hidden />
              </span>
              {intl.formatMessage({
                id: "visit_log.detail.order_title",
                defaultMessage: "Linked Sales Order",
              })}
            </CardTitle>
            <CardDescription>
              {visitLog.salesOrder.documentNumber ?? visitLog.salesOrder.id}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <button
              type="button"
              onClick={() => navigate(`/sales-order/${visitLog.salesOrder!.id}`)}
              className="flex w-full cursor-pointer items-center gap-3 px-6 py-3 text-left transition-colors duration-150 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--module-order)_14%,transparent)] text-[var(--module-order)]">
                <ShoppingCart className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {visitLog.salesOrder.documentNumber ?? visitLog.salesOrder.id}
                </span>
                {visitLog.salesOrder.grandTotal != null ? (
                  <span className="block font-mono text-xs tabular-nums text-muted-foreground">
                    {visitLog.salesOrder.grandTotal}
                  </span>
                ) : null}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={intl.formatMessage({
          id: "visit_log.detail.delete_title",
          defaultMessage: "Delete visitLog",
        })}
        description={intl.formatMessage(
          {
            id: "visit_log.index.delete_confirm_body",
            defaultMessage: 'Delete "{name}"? This action cannot be undone.',
          },
          { name: title },
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
                id: "visit_log.detail.draft_followup",
                defaultMessage: "Draft follow-up",
              })}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {intl.formatMessage({
                id: "visit_log.detail.draft_followup",
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
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{draftResult}</ReactMarkdown>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
};
