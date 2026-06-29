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
import { ActionProgramIcon } from "./ActionProgramIcons";

type ActionProgramDetail = {
  id: string;
  documentNumber: string | null;
  name: string;
  type: string;
  startDate: string | null;
  endDate: string | null;
  budget: number | null;
  status: string;
  description: string | null;
  area: { id: string; name: string } | null;
  pic: { id: string; name: string } | null;
  outlets: { id: string; name: string }[];
  skus: { id: string; name: string }[];
};

export const ActionProgramDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("actionProgram@update");
  const canDelete = hasPermission("actionProgram@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["actionProgramDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.actionProgram.detail.query({ id: id ?? "" }),
  });

  const actionProgram = data as ActionProgramDetail | undefined;

  const handleDelete = async () => {
    if (!actionProgram || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.actionProgram.delete.mutate({ id: actionProgram.id });
      await queryClient.invalidateQueries({ queryKey: ["actionProgramList"] });
      setDeleteModalOpen(false);
      toast.success(intl.formatMessage({ id: "action_program.detail.delete_success", defaultMessage: "Region deleted" }));
      navigate("/actionProgram");
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

  if (!actionProgram) {
    return (
      <div className="so-page">
        <div className="so-form__shell" style={{ maxWidth: 480, margin: "60px auto" }}>
          <div className="so-card">
            <div className="so-card__body">
              <p style={{ color: "var(--ios-state-danger, #DC2626)", margin: 0 }}>
                {intl.formatMessage({ id: "action_program.detail.not_found", defaultMessage: "Region not found" })}
              </p>
              <button type="button" className="so-btn so-btn--ghost" style={{ marginTop: 12 }} onClick={() => navigate("/actionProgram")}>
                <ActionProgramIcon name="back" size={14} />
                {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="so-page" data-ai-context={JSON.stringify({ section: "actionProgram-detail", id: actionProgram.id, name: actionProgram.name, areaCount: actionProgram.outlets?.length ?? 0 })}>
      {/* ── Hero ── */}
      <header className="so-detail-hero">
        <div className="so-detail-hero__top">
          <ButtonGroup
            size="md"
            items={[{ key: "back", label: intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" }), icon: <ActionProgramIcon name="back" size={14} />, to: "/actionProgram" }]}
          />
          <ButtonGroup
            size="md"
            items={[
              ...(canUpdate ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), icon: <ActionProgramIcon name="edit" size={14} />, to: `/actionProgram/${actionProgram.id}/edit` }] : []),
              ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <ActionProgramIcon name="delete" size={14} />, onClick: () => setDeleteModalOpen(true), variant: "danger" as const }] : []),
            ]}
          />
        </div>

        <div className="so-detail-hero__title-block">
          <div className="so-detail-hero__title-row">
            <div className="so-detail-hero__title-stack">
              <span className="so-detail-hero__kicker">{intl.formatMessage({ id: "nav.programs", defaultMessage: "Programs" })}</span>
              <h1 className="so-detail-hero__title">{actionProgram.name}</h1>
              <span className="so-detail-hero__sub">{actionProgram.code ?? "—"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Summary ── */}
      <section className="so-card">
        <div className="so-card__header">
          <h2 className="so-card__title">
            <span className="so-card__icon"><ActionProgramIcon name="document" size={14} /></span>
            {intl.formatMessage({ id: "action_program.detail.summary", defaultMessage: "Summary" })}
          </h2>
        </div>
        <div className="so-card__body">
          <div className="so-section so-section--2">
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "action_program.detail.code_label", defaultMessage: "Code" })}</span>
              <span className="so-field__value">{actionProgram.code ?? "—"}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "action_program.detail.name_label", defaultMessage: "Name" })}</span>
              <span className="so-field__value">{actionProgram.name}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "action_program.detail.areas_label", defaultMessage: "Outlets" })}</span>
              <span className="so-field__value">{actionProgram.outlets?.length ?? 0}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Areas ── */}
      <section className="so-card">
        <div className="so-card__header">
          <h2 className="so-card__title">
            <span className="so-card__icon"><ActionProgramIcon name="outlet" size={14} /></span>
            {intl.formatMessage({ id: "action_program.detail.outlets_title", defaultMessage: "Outlets" })}
          </h2>
          <p className="so-card__hint">{actionProgram.outlets?.length ?? 0} areas</p>
        </div>
        <div className="so-card__body" style={{ padding: 0 }}>
          {actionProgram.outlets?.length ?? 0 === 0 ? (
            <div className="so-card__body" style={{ textAlign: "center", padding: "2rem" }}>
              <ActionProgramIcon name="outlet" size={48} />
              <p style={{ marginTop: 12, color: "var(--ios-label-2)" }}>{intl.formatMessage({ id: "action_program.detail.no_outlets", defaultMessage: "No outlets yet" })}</p>
            </div>
          ) : (
            <div className="so-items-table">
              <div className="so-items-table__body">
                {actionProgram.outlets?.map((outlet) => (
                  <div key={outlet.id} className="so-items-table__row" style={{ cursor: "pointer" }} onClick={() => navigate(`/outlet/${outlet.id}`)}>
                    <div className="so-items-table__td so-items-table__td--product">
                      <span className="so-items-table__icon" data-tint="blue" aria-hidden="true"><ActionProgramIcon name="outlet" size={16} /></span>
                      <div className="so-items-table__product">
                        <span className="so-items-table__product-name">{outlet.name}</span>
                        {outlet.code && <span className="so-items-table__product-code">{outlet.code}</span>}
                      </div>
                    </div>
                    <div className="so-items-table__td so-items-table__td--num so-items-table__td--muted">
                      <ActionProgramIcon name="chevron-right" size={16} />
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
              <h3><ActionProgramIcon name="delete" size={16} /> {intl.formatMessage({ id: "action_program.detail.delete_title", defaultMessage: "Delete actionProgram" })}</h3>
              <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setDeleteModalOpen(false)} aria-label="Close">
                <ActionProgramIcon name="close" size={14} />
              </button>
            </div>
            <div className="so-modal__body">
              <div className="so-modal__icon so-modal__icon--error"><ActionProgramIcon name="delete" size={28} /></div>
              <h3 className="so-modal__title">{intl.formatMessage({ id: "action_program.detail.delete_confirm_title", defaultMessage: "Are you sure?" })}</h3>
              <p className="so-modal__msg">
                {intl.formatMessage({ id: "action_program.index.delete_confirm_body", defaultMessage: 'Delete "{name}"? This action cannot be undone.' }, { name: actionProgram.name })}
              </p>
            </div>
            <div className="so-modal__footer">
              <button className="so-btn so-btn--ghost" onClick={() => setDeleteModalOpen(false)}>
                {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
              </button>
              <button className="so-btn so-btn--danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <span className="so-spinner" />}
                <ActionProgramIcon name="delete" size={14} />
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