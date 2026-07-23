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

import { AreaIcon } from "./AreaIcons";

type AreaDetail = {
  id: string;
  code: string | null;
  name: string;
  region: { id: string; name: string } | null;
  outlets: { id: string; code: string | null; name: string }[];
};

export const AreaDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("area@update");
  const canDelete = hasPermission("area@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["areaDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.area.detail.query({ id: id ?? "" }),
  });

  const area = data as AreaDetail | undefined;

  const handleDelete = async () => {
    if (!area || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.area.delete.mutate({ id: area.id });
      await queryClient.invalidateQueries({ queryKey: ["areaList"] });
      setDeleteModalOpen(false);
      toast.success(intl.formatMessage({ id: "area.detail.delete_success", defaultMessage: "Region deleted" }));
      navigate("/area");
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

  if (!area) {
    return (
      <div className="so-page">
        <div className="so-form__shell" style={{ maxWidth: 480, margin: "60px auto" }}>
          <div className="so-card">
            <div className="so-card__body">
              <p style={{ color: "var(--ios-state-danger, #DC2626)", margin: 0 }}>
                {intl.formatMessage({ id: "area.detail.not_found", defaultMessage: "Region not found" })}
              </p>
              <button type="button" className="so-btn so-btn--ghost" style={{ marginTop: 12 }} onClick={() => navigate("/area")}>
                <AreaIcon name="back" size={14} />
                {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="so-page" data-ai-context={JSON.stringify({ section: "area-detail", id: area.id, name: area.name, areaCount: area.outlets.length })}>
      {/* ── Hero ── */}
      <header className="so-detail-hero">
        <div className="so-detail-hero__top">
          <ButtonGroup
            size="md"
            items={[{ key: "back", label: intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" }), icon: <AreaIcon name="back" size={14} />, to: "/area" }]}
          />
          <ButtonGroup
            size="md"
            items={[
              ...(canUpdate ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), icon: <AreaIcon name="edit" size={14} />, to: `/area/${area.id}/edit` }] : []),
              ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <AreaIcon name="delete" size={14} />, onClick: () => setDeleteModalOpen(true), variant: "danger" as const }] : []),
            ]}
          />
        </div>

        <div className="so-detail-hero__title-block">
          <div className="so-detail-hero__title-row">
            <div className="so-detail-hero__title-stack">
              <span className="so-detail-hero__kicker">{intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}</span>
              <h1 className="so-detail-hero__title">{area.name}</h1>
              <span className="so-detail-hero__sub">{area.code ?? "—"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Summary ── */}
      <section className="so-card">
        <div className="so-card__header">
          <h2 className="so-card__title">
            <span className="so-card__icon"><AreaIcon name="grid" size={14} /></span>
            {intl.formatMessage({ id: "area.detail.summary", defaultMessage: "Summary" })}
          </h2>
        </div>
        <div className="so-card__body">
          <div className="so-section so-section--2">
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "area.detail.code_label", defaultMessage: "Code" })}</span>
              <span className="so-field__value">{area.code ?? "—"}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "area.detail.name_label", defaultMessage: "Name" })}</span>
              <span className="so-field__value">{area.name}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "area.detail.areas_label", defaultMessage: "Outlets" })}</span>
              <span className="so-field__value">{area.outlets.length}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Areas ── */}
      <section className="so-card">
        <div className="so-card__header">
          <h2 className="so-card__title">
            <span className="so-card__icon"><AreaIcon name="outlet" size={14} /></span>
            {intl.formatMessage({ id: "area.detail.outlets_title", defaultMessage: "Outlets" })}
          </h2>
          <p className="so-card__hint">{area.outlets.length} outlets</p>
        </div>
        <div className="so-card__body" style={{ padding: 0 }}>
          {area.outlets.length === 0 ? (
            <div className="so-card__body" style={{ textAlign: "center", padding: "2rem" }}>
              <AreaIcon name="outlet" size={48} />
              <p style={{ marginTop: 12, color: "var(--ios-label-2)" }}>{intl.formatMessage({ id: "area.detail.no_outlets", defaultMessage: "No outlets yet" })}</p>
            </div>
          ) : (
            <div className="so-items-table so-items-table--compact">
              <div className="so-items-table__body">
                {area.outlets.map((outlet) => (
                  <div key={outlet.id} className="so-items-table__row" style={{ cursor: "pointer" }} onClick={() => navigate(`/outlet/${outlet.id}`)}>
                    <div className="so-items-table__td so-items-table__td--product">
                      <span className="so-items-table__icon" data-tint="blue" aria-hidden="true"><AreaIcon name="outlet" size={16} /></span>
                      <div className="so-items-table__product">
                        <span className="so-items-table__product-name">{outlet.name}</span>
                        {outlet.code && <span className="so-items-table__product-code">{outlet.code}</span>}
                      </div>
                    </div>
                    <div className="so-items-table__td so-items-table__td--num so-items-table__td--muted">
                      <AreaIcon name="chevron-right" size={16} />
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
              <h3><AreaIcon name="delete" size={16} /> {intl.formatMessage({ id: "area.detail.delete_title", defaultMessage: "Delete area" })}</h3>
              <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setDeleteModalOpen(false)} aria-label="Close">
                <AreaIcon name="close" size={14} />
              </button>
            </div>
            <div className="so-modal__body">
              <div className="so-modal__icon so-modal__icon--error"><AreaIcon name="delete" size={28} /></div>
              <h3 className="so-modal__title">{intl.formatMessage({ id: "area.detail.delete_confirm_title", defaultMessage: "Are you sure?" })}</h3>
              <p className="so-modal__msg">
                {intl.formatMessage({ id: "area.index.delete_confirm_body", defaultMessage: 'Delete "{name}"? This action cannot be undone.' }, { name: area.name })}
              </p>
            </div>
            <div className="so-modal__footer">
              <button className="so-btn so-btn--ghost" onClick={() => setDeleteModalOpen(false)}>
                {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
              </button>
              <button className="so-btn so-btn--danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <span className="so-spinner" />}
                <AreaIcon name="delete" size={14} />
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