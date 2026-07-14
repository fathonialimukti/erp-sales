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
import { Spinner } from "../../ui/Spinner";
import { useToast } from "../../ui/useToast";
import { Modal, ModalHeader, ModalBody } from "../../ui";

import { EventProposalIcon } from "./EventProposalIcons";

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

  const { data, isLoading } = useQuery({
    queryKey: ["eventProposalDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.eventProposal.detail.query({ id: id ?? "" }),
  });

  const eventProposal = data as EventProposalDetail | undefined;

  const handleDelete = async () => {
    if (!eventProposal || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.eventProposal.delete.mutate({ id: eventProposal.id });
      await queryClient.invalidateQueries({ queryKey: ["eventProposalList"] });
      setDeleteModalOpen(false);
      toast.success(intl.formatMessage({ id: "event_proposal.detail.delete_success", defaultMessage: "Region deleted" }));
      navigate("/eventProposal");
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

  if (!eventProposal) {
    return (
      <div className="so-page">
        <div className="so-form__shell" style={{ maxWidth: 480, margin: "60px auto" }}>
          <div className="so-card">
            <div className="so-card__body">
              <p style={{ color: "var(--ios-state-danger, #DC2626)", margin: 0 }}>
                {intl.formatMessage({ id: "event_proposal.detail.not_found", defaultMessage: "Region not found" })}
              </p>
              <button type="button" className="so-btn so-btn--ghost" style={{ marginTop: 12 }} onClick={() => navigate("/eventProposal")}>
                <EventProposalIcon name="back" size={14} />
                {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="so-page" data-ai-context={JSON.stringify({ section: "eventProposal-detail", id: eventProposal.id, name: eventProposal.name, areaCount: eventProposal.skus?.length ?? 0 })}>
      {/* ── Hero ── */}
      <header className="so-detail-hero">
        <div className="so-detail-hero__top">
          <ButtonGroup
            size="md"
            items={[{ key: "back", label: intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" }), icon: <EventProposalIcon name="back" size={14} />, to: "/eventProposal" }]}
          />
          <ButtonGroup
            size="md"
            items={[
              ...(canUpdate ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), icon: <EventProposalIcon name="edit" size={14} />, to: `/eventProposal/${eventProposal.id}/edit` }] : []),
              { key: "draft", label: intl.formatMessage({ id: "event_proposal.detail.draft_followup", defaultMessage: "Draft follow-up" }), icon: <EventProposalIcon name="sparkle" size={14} />, onClick: handleDraftFollowUp },
              ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <EventProposalIcon name="delete" size={14} />, onClick: () => setDeleteModalOpen(true), variant: "danger" as const }] : []),
            ]}
          />
        </div>

        <div className="so-detail-hero__title-block">
          <div className="so-detail-hero__title-row">
            <div className="so-detail-hero__title-stack">
              <span className="so-detail-hero__kicker">{intl.formatMessage({ id: "nav.programs", defaultMessage: "Programs" })}</span>
              <h1 className="so-detail-hero__title">{eventProposal.name}</h1>
              <span className="so-detail-hero__sub">{eventProposal.documentNumber ?? "—"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Summary ── */}
      <section className="so-card">
        <div className="so-card__header">
          <h2 className="so-card__title">
            <span className="so-card__icon"><EventProposalIcon name="document" size={14} /></span>
            {intl.formatMessage({ id: "event_proposal.detail.summary", defaultMessage: "Summary" })}
          </h2>
        </div>
        <div className="so-card__body">
          <div className="so-section so-section--2">
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "event_proposal.detail.code_label", defaultMessage: "Document" })}</span>
              <span className="so-field__value">{eventProposal.documentNumber ?? "—"}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "event_proposal.detail.name_label", defaultMessage: "Name" })}</span>
              <span className="so-field__value">{eventProposal.name}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "event_proposal.detail.areas_label", defaultMessage: "Payments" })}</span>
              <span className="so-field__value">{eventProposal.skus?.length ?? 0}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Areas ── */}
      <section className="so-card">
        <div className="so-card__header">
          <h2 className="so-card__title">
            <span className="so-card__icon"><EventProposalIcon name="payment" size={14} /></span>
            {intl.formatMessage({ id: "event_proposal.detail.payments_title", defaultMessage: "Payments" })}
          </h2>
          <p className="so-card__hint">{eventProposal.skus?.length ?? 0} areas</p>
        </div>
        <div className="so-card__body" style={{ padding: 0 }}>
          {eventProposal.skus?.length ?? 0 === 0 ? (
            <div className="so-card__body" style={{ textAlign: "center", padding: "2rem" }}>
              <EventProposalIcon name="payment" size={48} />
              <p style={{ marginTop: 12, color: "var(--ios-label-2)" }}>{intl.formatMessage({ id: "event_proposal.detail.no_payments", defaultMessage: "No SKUs yet" })}</p>
            </div>
          ) : (
            <div className="so-items-table">
              <div className="so-items-table__body">
                {eventProposal.skus?.map((sku) => (
                  <div key={sku.id} className="so-items-table__row" style={{ cursor: "pointer" }} onClick={() => navigate(`/sku/${sku.sku.id}`)}>
                    <div className="so-items-table__td so-items-table__td--product">
                      <span className="so-items-table__icon" data-tint="blue" aria-hidden="true"><EventProposalIcon name="payment" size={16} /></span>
                      <div className="so-items-table__product">
                        <span className="so-items-table__product-name">{sku.sku.name}</span>
                        {sku.sku.code && <span className="so-items-table__product-code">{sku.sku.code}</span>}
                      </div>
                    </div>
                    <div className="so-items-table__td so-items-table__td--num so-items-table__td--muted">
                      <EventProposalIcon name="chevron-right" size={16} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Delete Modal ── */}
      {deleteModalOpen && createPortal(
        <div className="so-modal__backdrop" onClick={() => !isDeleting && setDeleteModalOpen(false)}>
          <div className="so-modal" onClick={(e) => e.stopPropagation()}>
            <div className="so-modal__header">
              <h3><EventProposalIcon name="delete" size={16} /> {intl.formatMessage({ id: "event_proposal.detail.delete_title", defaultMessage: "Delete eventProposal" })}</h3>
              <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setDeleteModalOpen(false)} aria-label="Close">
                <EventProposalIcon name="close" size={14} />
              </button>
            </div>
            <div className="so-modal__body">
              <div className="so-modal__icon so-modal__icon--error"><EventProposalIcon name="delete" size={28} /></div>
              <h3 className="so-modal__title">{intl.formatMessage({ id: "event_proposal.detail.delete_confirm_title", defaultMessage: "Are you sure?" })}</h3>
              <p className="so-modal__msg">
                {intl.formatMessage({ id: "event_proposal.index.delete_confirm_body", defaultMessage: 'Delete "{name}"? This action cannot be undone.' }, { name: eventProposal.name })}
              </p>
            </div>
            <div className="so-modal__footer">
              <button className="so-btn so-btn--ghost" onClick={() => setDeleteModalOpen(false)}>
                {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
              </button>
              <button className="so-btn so-btn--danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <span className="so-spinner" />}
                <EventProposalIcon name="delete" size={14} />
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
          {intl.formatMessage({ id: "event_proposal.detail.draft_followup", defaultMessage: "Draft follow-up" })}
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