import { useState } from "react";
import { createPortal } from "react-dom";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { ButtonGroup } from "../../components/ButtonGroup";
import { Spinner } from "../../ui/Spinner";
import { useToast } from "../../ui/useToast";
import { VisitLogIcon } from "./VisitLogIcons";

type VisitLogDetail = {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  purpose: string | null;
  notes: string | null;
  feedback: string | null;
  salesman: { id: string; name: string } | null;
  outlet: { id: string; name: string; customer: { id: string; name: string } | null; area: { id: string; name: string } | null } | null;
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

  return (
    <section className="so-page" data-ai-context={JSON.stringify({ section: "visitLog-detail", id: visitLog.id, name: visitLog.name, areaCount: visitLog.areas.length })}>
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
              ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <VisitLogIcon name="delete" size={14} />, onClick: () => setDeleteModalOpen(true), variant: "danger" as const }] : []),
            ]}
          />
        </div>

        <div className="so-detail-hero__title-block">
          <div className="so-detail-hero__title-row">
            <div className="so-detail-hero__title-stack">
              <span className="so-detail-hero__kicker">{intl.formatMessage({ id: "nav.field_ops", defaultMessage: "Field Operations" })}</span>
              <h1 className="so-detail-hero__title">{visitLog.name}</h1>
              <span className="so-detail-hero__sub">{visitLog.code ?? "—"}</span>
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
              <span className="so-field__label">{intl.formatMessage({ id: "visit_log.detail.code_label", defaultMessage: "Code" })}</span>
              <span className="so-field__value">{visitLog.code ?? "—"}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "visit_log.detail.name_label", defaultMessage: "Name" })}</span>
              <span className="so-field__value">{visitLog.name}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "visit_log.detail.areas_label", defaultMessage: "Details" })}</span>
              <span className="so-field__value">{visitLog.areas.length}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Areas ── */}
      <section className="so-card">
        <div className="so-card__header">
          <h2 className="so-card__title">
            <span className="so-card__icon"><VisitLogIcon name="item" size={14} /></span>
            {intl.formatMessage({ id: "visit_log.detail.none_title", defaultMessage: "Details" })}
          </h2>
          <p className="so-card__hint">{visitLog.areas.length} areas</p>
        </div>
        <div className="so-card__body" style={{ padding: 0 }}>
          {visitLog.areas.length === 0 ? (
            <div className="so-card__body" style={{ textAlign: "center", padding: "2rem" }}>
              <VisitLogIcon name="item" size={48} />
              <p style={{ marginTop: 12, color: "var(--ios-label-2)" }}>{intl.formatMessage({ id: "visit_log.detail.no_none", defaultMessage: "No data" })}</p>
            </div>
          ) : (
            <div className="so-items-table">
              <div className="so-items-table__body">
                {visitLog.areas.map((area) => (
                  <div key={area.id} className="so-items-table__row" style={{ cursor: "pointer" }} onClick={() => navigate(`/area/${area.id}`)}>
                    <div className="so-items-table__td so-items-table__td--product">
                      <span className="so-items-table__icon" data-tint="blue" aria-hidden="true"><VisitLogIcon name="item" size={16} /></span>
                      <div className="so-items-table__product">
                        <span className="so-items-table__product-name">{area.name}</span>
                        {area.code && <span className="so-items-table__product-code">{area.code}</span>}
                      </div>
                    </div>
                    <div className="so-items-table__td so-items-table__td--num so-items-table__td--muted">
                      <VisitLogIcon name="chevron-right" size={16} />
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
              <h3><VisitLogIcon name="delete" size={16} /> {intl.formatMessage({ id: "visit_log.detail.delete_title", defaultMessage: "Delete visitLog" })}</h3>
              <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setDeleteModalOpen(false)} aria-label="Close">
                <VisitLogIcon name="close" size={14} />
              </button>
            </div>
            <div className="so-modal__body">
              <div className="so-modal__icon so-modal__icon--error"><VisitLogIcon name="delete" size={28} /></div>
              <h3 className="so-modal__title">{intl.formatMessage({ id: "visit_log.detail.delete_confirm_title", defaultMessage: "Are you sure?" })}</h3>
              <p className="so-modal__msg">
                {intl.formatMessage({ id: "visit_log.index.delete_confirm_body", defaultMessage: 'Delete "{name}"? This action cannot be undone.' }, { name: visitLog.name })}
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
    </section>
  );
};