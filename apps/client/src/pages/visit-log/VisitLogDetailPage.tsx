import { useState } from "react";
import { createPortal } from "react-dom";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { ButtonGroup } from "../../components/ButtonGroup";
import { Chip } from "../../ui/Chip";
import { Spinner } from "../../ui/Spinner";
import { useToast } from "../../ui/useToast";
import { Modal, ModalHeader, ModalBody } from "../../ui";

import { VisitLogIcon } from "./VisitLogIcons";

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
  outlet: { id: string; name: string; customer: { id: string; name: string } | null; area: { id: string; name: string } | null } | null;
  salesOrder: { id: string; documentNumber: string | null; grandTotal: number | null } | null;
};

const APPROVAL_TONE: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  DRAFT: "neutral",
  VALIDATING: "warning",
  PROPOSED: "info",
  APPROVED: "success",
  REJECTED: "danger",
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

  const { data, isLoading } = useQuery({
    queryKey: ["visitLogDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.visitLog.detail.query({ id: id ?? "" }),
  });

  const visitLog = data as VisitLogDetail | undefined;

  const handleDelete = async () => {
    if (!visitLog || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.visitLog.delete.mutate({ id: visitLog.id });
      await queryClient.invalidateQueries({ queryKey: ["visitLogList"] });
      setDeleteModalOpen(false);
      toast.success(intl.formatMessage({ id: "visit_log.detail.delete_success", defaultMessage: "Region deleted" }));
      navigate("/visitLog");
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

  if (!visitLog) {
    return (
      <div className="so-page">
        <div className="so-form__shell" style={{ maxWidth: 480, margin: "60px auto" }}>
          <div className="so-card">
            <div className="so-card__body">
              <p style={{ color: "var(--ios-state-danger, #DC2626)", margin: 0 }}>
                {intl.formatMessage({ id: "visit_log.detail.not_found", defaultMessage: "Region not found" })}
              </p>
              <button type="button" className="so-btn so-btn--ghost" style={{ marginTop: 12 }} onClick={() => navigate("/visitLog")}>
                <VisitLogIcon name="back" size={14} />
                {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const title = visitLog.outlet?.name ?? intl.formatMessage({ id: "visit_log.detail.unnamed", defaultMessage: "Visit Log" });

  return (
    <section className="so-page" data-ai-context={JSON.stringify({ section: "visitLog-detail", id: visitLog.id, name: title, outletId: visitLog.outlet?.id, approvalStatus: visitLog.approvalStatus })}>
      {/* ── Hero ── */}
      <header className="so-detail-hero">
        <div className="so-detail-hero__top">
          <ButtonGroup
            size="md"
            items={[{ key: "back", label: intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" }), icon: <VisitLogIcon name="back" size={14} />, to: "/visitLog" }]}
          />
          <ButtonGroup
            size="md"
            items={[
              ...(canUpdate ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), icon: <VisitLogIcon name="edit" size={14} />, to: `/visitLog/${visitLog.id}/edit` }] : []),
              { key: "draft", label: intl.formatMessage({ id: "visit_log.detail.draft_followup", defaultMessage: "Draft follow-up" }), icon: <VisitLogIcon name="sparkle" size={14} />, onClick: handleDraftFollowUp },
              ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <VisitLogIcon name="delete" size={14} />, onClick: () => setDeleteModalOpen(true), variant: "danger" as const }] : []),
            ]}
          />
        </div>

        <div className="so-detail-hero__title-block">
          <div className="so-detail-hero__title-row">
            <div className="so-detail-hero__title-stack">
              <span className="so-detail-hero__kicker">{intl.formatMessage({ id: "nav.field_ops", defaultMessage: "Field Operations" })}</span>
              <h1 className="so-detail-hero__title">{title}</h1>
              <span className="so-detail-hero__sub">{visitLog.outlet?.customer?.name ?? "—"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Summary ── */}
      <section className="so-card">
        <div className="so-card__header">
          <h2 className="so-card__title">
            <span className="so-card__icon"><VisitLogIcon name="clipboard" size={14} /></span>
            {intl.formatMessage({ id: "visit_log.detail.summary", defaultMessage: "Summary" })}
          </h2>
        </div>
        <div className="so-card__body">
          <div className="so-section so-section--2">
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "visit_log.detail.date_label", defaultMessage: "Date" })}</span>
              <span className="so-field__value">{visitLog.date}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "visit_log.detail.status_label", defaultMessage: "Status" })}</span>
              <span className="so-field__value">
                <Chip tone={APPROVAL_TONE[visitLog.approvalStatus] ?? "neutral"} size="sm">
                  {(() => {
                    const s = visitLog.approvalStatus.toUpperCase();
                    if (s === "DRAFT") return intl.formatMessage({ id: "visit_log.index.status_draft", defaultMessage: "Draft" });
                    if (s === "VALIDATING") return intl.formatMessage({ id: "visit_log.index.status_validating", defaultMessage: "AI Processing" });
                    if (s === "PROPOSED") return intl.formatMessage({ id: "visit_log.index.status_proposed", defaultMessage: "Pending Approval" });
                    if (s === "APPROVED") return intl.formatMessage({ id: "visit_log.index.status_approved", defaultMessage: "Approved" });
                    if (s === "REJECTED") return intl.formatMessage({ id: "visit_log.index.status_rejected", defaultMessage: "Rejected" });
                    return visitLog.approvalStatus;
                  })()}
                </Chip>
              </span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "visit_log.detail.salesman_label", defaultMessage: "Salesman" })}</span>
              <span className="so-field__value">{visitLog.salesman?.name ?? "—"}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "visit_log.detail.outlet_label", defaultMessage: "Outlet" })}</span>
              <span className="so-field__value">{visitLog.outlet?.name ?? "—"}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "visit_log.detail.purpose_label", defaultMessage: "Purpose" })}</span>
              <span className="so-field__value">{visitLog.purpose ?? "—"}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "visit_log.detail.notes_label", defaultMessage: "Notes" })}</span>
              <span className="so-field__value">{visitLog.notes ?? "—"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Linked Sales Order ── */}
      {visitLog.salesOrder && (
        <section className="so-card">
          <div className="so-card__header">
            <h2 className="so-card__title">
              <span className="so-card__icon"><VisitLogIcon name="item" size={14} /></span>
              {intl.formatMessage({ id: "visit_log.detail.order_title", defaultMessage: "Linked Sales Order" })}
            </h2>
          </div>
          <div className="so-card__body" style={{ padding: 0 }}>
            <div className="so-items-table so-items-table--compact">
              <div className="so-items-table__body">
                <div className="so-items-table__row" style={{ cursor: "pointer" }} onClick={() => navigate(`/sales-order/${visitLog.salesOrder!.id}`)}>
                  <div className="so-items-table__td so-items-table__td--product">
                    <span className="so-items-table__icon" data-tint="blue" aria-hidden="true"><VisitLogIcon name="item" size={16} /></span>
                    <div className="so-items-table__product">
                      <span className="so-items-table__product-name">{visitLog.salesOrder.documentNumber ?? visitLog.salesOrder.id}</span>
                      {visitLog.salesOrder.grandTotal != null && (
                        <span className="so-items-table__product-code">{visitLog.salesOrder.grandTotal}</span>
                      )}
                    </div>
                  </div>
                  <div className="so-items-table__td so-items-table__td--num so-items-table__td--muted">
                    <VisitLogIcon name="chevron-right" size={16} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Delete Modal ── */}
      {deleteModalOpen && createPortal(
        <div className="so-modal__backdrop" onClick={() => !isDeleting && setDeleteModalOpen(false)}>
          <div className="so-modal" onClick={(e) => e.stopPropagation()}>
            <div className="so-modal__header">
              <h3><VisitLogIcon name="delete" size={16} /> {intl.formatMessage({ id: "visit_log.detail.delete_title", defaultMessage: "Delete visitLog" })}</h3>
              <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setDeleteModalOpen(false)} aria-label="Close">
                <VisitLogIcon name="close" size={14} />
              </button>
            </div>
            <div className="so-modal__body">
              <div className="so-modal__icon so-modal__icon--error"><VisitLogIcon name="delete" size={28} /></div>
              <h3 className="so-modal__title">{intl.formatMessage({ id: "visit_log.detail.delete_confirm_title", defaultMessage: "Are you sure?" })}</h3>
              <p className="so-modal__msg">
                {intl.formatMessage({ id: "visit_log.index.delete_confirm_body", defaultMessage: 'Delete "{name}"? This action cannot be undone.' }, { name: title })}
              </p>
            </div>
            <div className="so-modal__footer">
              <button className="so-btn so-btn--ghost" onClick={() => setDeleteModalOpen(false)}>
                {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
              </button>
              <button className="so-btn so-btn--danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <span className="so-spinner" />}
                <VisitLogIcon name="delete" size={14} />
                {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
      {/* Draft Follow-up Modal */}
      <Modal isOpen={draftModalOpen} onClose={() => setDraftModalOpen(false)} size="xl">
        <ModalHeader onClose={() => setDraftModalOpen(false)}>
          {intl.formatMessage({ id: "visit_log.detail.draft_followup", defaultMessage: "Draft follow-up" })}
        </ModalHeader>
        <ModalBody>
          {draftLoading && <Spinner />}
          {draftError && <p className="text-red-600">{draftError}</p>}
          {draftResult && (
            <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
              {draftResult}
            </ReactMarkdown>
          )}
        </ModalBody>
      </Modal>
    </section>
  );
};