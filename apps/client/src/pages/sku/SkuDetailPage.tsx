import { useState } from "react";
import { createPortal } from "react-dom";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { Chip } from "../../ui/Chip";
import { Spinner } from "../../ui/Spinner";
import { useToast } from "../../ui/useToast";
import { ButtonGroup } from "../../components/ButtonGroup";


type SkuDetail = {
  id: string;
  code: string | null;
  name: string;
  basePrice: number | null;
  baseUnit: string | null;
  status: string;
  category: { id: string; name: string } | null;
  description: string | null;
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

const BackIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);
const DeleteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const SkuDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("sku@update");
  const canDelete = hasPermission("sku@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["skuDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.sku.detail.query({ id: id ?? "" }),
  });

  const sku = data as SkuDetail | undefined;

  const handleDelete = async () => {
    if (!sku || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.sku.delete.mutate({ id: sku.id });
      await queryClient.invalidateQueries({ queryKey: ["skuList"] });
      setDeleteModalOpen(false);
      toast.success(intl.formatMessage({ id: "sku.detail.delete_success", defaultMessage: "SKU deleted" }));
      navigate("/sku");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="m-page">
        <div className="m-state m-state--loading">
          <Spinner size="lg" />
          <span className="m-state__title">{intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}</span>
        </div>
      </section>
    );
  }

  if (!sku) {
    return (
      <section className="m-page">
        <div className="m-card">
          <div className="m-card__body">
            <p style={{ color: "var(--ios-state-danger, #DC2626)", margin: 0 }}>
              {intl.formatMessage({ id: "sku.detail.not_found", defaultMessage: "SKU not found" })}
            </p>
            <button type="button" className="m-btn m-btn--ghost" style={{ marginTop: 12 }} onClick={() => navigate("/sku")}>
              <BackIcon />
              {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="m-page" data-ai-context={JSON.stringify({ section: "sku-detail", id: sku.id, name: sku.name, status: sku.status })}>
      <header className="m-detail-hero">
        <div className="m-detail-hero__top">
          <ButtonGroup size="md" items={[{ key: "back", label: intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" }), icon: <BackIcon />, to: "/sku" }]} />
          <ButtonGroup size="md" items={[
            ...(canUpdate ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), icon: <EditIcon />, to: `/sku/${sku.id}/edit` }] : []),
            ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <DeleteIcon />, onClick: () => setDeleteModalOpen(true), variant: "danger" as const }] : []),
          ]} />
        </div>
        <div className="m-detail-hero__title-block">
          <div className="m-detail-hero__title-row">
            <div className="m-detail-hero__title-stack">
              <span className="m-detail-hero__kicker">{intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}</span>
              <h1 className="m-detail-hero__title">{sku.name}</h1>
              <span className="m-detail-hero__sub">{sku.code ?? "—"}</span>
            </div>
          </div>
        </div>
      </header>

      <section className="m-card">
        <div className="m-card__header">
          <h2 className="m-card__title">{intl.formatMessage({ id: "sku.detail.summary", defaultMessage: "Summary" })}</h2>
        </div>
        <div className="m-card__body">
          <div className="m-section m-section--2">
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "sku.detail.code_label", defaultMessage: "Code" })}</span>
              <span className="m-field__value">{sku.code ?? "—"}</span>
            </div>
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "sku.detail.name_label", defaultMessage: "Name" })}</span>
              <span className="m-field__value">{sku.name}</span>
            </div>
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "sku.detail.category_label", defaultMessage: "Category" })}</span>
              <span className="m-field__value">{sku.category?.name ?? "—"}</span>
            </div>
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "sku.detail.price_label", defaultMessage: "Base price" })}</span>
              <span className="m-field__value">{sku.basePrice != null ? formatCurrency(sku.basePrice) : "—"}</span>
            </div>
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "sku.detail.unit_label", defaultMessage: "Base unit" })}</span>
              <span className="m-field__value">{sku.baseUnit ?? "—"}</span>
            </div>
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "sku.detail.status_label", defaultMessage: "Status" })}</span>
              <span className="m-field__value">
                <Chip tone={sku.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                  {sku.status === "ACTIVE"
                    ? intl.formatMessage({ id: "sku.detail.status_active", defaultMessage: "Active" })
                    : sku.status === "INACTIVE"
                      ? intl.formatMessage({ id: "sku.detail.status_inactive", defaultMessage: "Inactive" })
                      : sku.status}
                </Chip>
              </span>
            </div>
          </div>
        </div>
      </section>

      {sku.description && (
        <section className="m-card">
          <div className="m-card__header">
            <h2 className="m-card__title">{intl.formatMessage({ id: "sku.detail.description_title", defaultMessage: "Description" })}</h2>
          </div>
          <div className="m-card__body">
            <p style={{ color: "var(--ios-label-2)", fontSize: "0.875rem", lineHeight: 1.5 }}>{sku.description}</p>
          </div>
        </section>
      )}

      {deleteModalOpen && createPortal(
        <div className="m-modal__backdrop" onClick={() => !isDeleting && setDeleteModalOpen(false)}>
          <div className="m-modal" onClick={(e) => e.stopPropagation()}>
            <div className="m-modal__header">
              <h3>{intl.formatMessage({ id: "sku.detail.delete_title", defaultMessage: "Delete SKU" })}</h3>
              <button className="m-btn m-btn--ghost m-btn--sm" onClick={() => setDeleteModalOpen(false)} aria-label="Close"><CloseIcon /></button>
            </div>
            <div className="m-modal__body">
              <div className="m-modal__icon m-modal__icon--error"><DeleteIcon /></div>
              <h3 className="m-modal__title">{intl.formatMessage({ id: "sku.detail.delete_confirm_title", defaultMessage: "Are you sure?" })}</h3>
              <p className="m-modal__msg">{intl.formatMessage({ id: "sku.detail.delete_confirm_body", defaultMessage: 'Delete "{name}"? This action cannot be undone.' }, { name: sku.name })}</p>
            </div>
            <div className="m-modal__footer">
              <button className="m-btn m-btn--ghost" onClick={() => setDeleteModalOpen(false)}>{intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}</button>
              <button className="m-btn m-btn--danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <span className="m-spinner" />}
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
