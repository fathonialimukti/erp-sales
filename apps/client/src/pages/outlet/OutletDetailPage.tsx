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
import { OutletIcon } from "./OutletIcons";

type OutletDetail = {
  id: string;
  code: string | null;
  name: string;
  address: string | null;
  status: string;
  customer: { id: string; name: string } | null;
  area: { id: string; name: string; region: { id: string; name: string } } | null;
  contacts: { id: string; name: string; title: string | null; email: string | null; phone: string | null }[];
};

export const OutletDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("outlet@update");
  const canDelete = hasPermission("outlet@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["outletDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.outlet.detail.query({ id: id ?? "" }),
  });

  const outlet = data as OutletDetail | undefined;

  const handleDelete = async () => {
    if (!outlet || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.outlet.delete.mutate({ id: outlet.id });
      await queryClient.invalidateQueries({ queryKey: ["outletList"] });
      setDeleteModalOpen(false);
      toast.success(intl.formatMessage({ id: "outlet.detail.delete_success", defaultMessage: "Region deleted" }));
      navigate("/outlet");
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

  if (!outlet) {
    return (
      <div className="so-page">
        <div className="so-form__shell" style={{ maxWidth: 480, margin: "60px auto" }}>
          <div className="so-card">
            <div className="so-card__body">
              <p style={{ color: "var(--ios-state-danger, #DC2626)", margin: 0 }}>
                {intl.formatMessage({ id: "outlet.detail.not_found", defaultMessage: "Region not found" })}
              </p>
              <button type="button" className="so-btn so-btn--ghost" style={{ marginTop: 12 }} onClick={() => navigate("/outlet")}>
                <OutletIcon name="back" size={14} />
                {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="so-page" data-ai-context={JSON.stringify({ section: "outlet-detail", id: outlet.id, name: outlet.name, areaCount: outlet.contacts?.length ?? 0 })}>
      {/* ── Hero ── */}
      <header className="so-detail-hero">
        <div className="so-detail-hero__top">
          <ButtonGroup
            size="md"
            items={[{ key: "back", label: intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" }), icon: <OutletIcon name="back" size={14} />, to: "/outlet" }]}
          />
          <ButtonGroup
            size="md"
            items={[
              ...(canUpdate ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), icon: <OutletIcon name="edit" size={14} />, to: `/outlet/${outlet.id}/edit` }] : []),
              ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <OutletIcon name="delete" size={14} />, onClick: () => setDeleteModalOpen(true), variant: "danger" as const }] : []),
            ]}
          />
        </div>

        <div className="so-detail-hero__title-block">
          <div className="so-detail-hero__title-row">
            <div className="so-detail-hero__title-stack">
              <span className="so-detail-hero__kicker">{intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}</span>
              <h1 className="so-detail-hero__title">{outlet.name}</h1>
              <span className="so-detail-hero__sub">{outlet.code ?? "—"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Summary ── */}
      <section className="so-card">
        <div className="so-card__header">
          <h2 className="so-card__title">
            <span className="so-card__icon"><OutletIcon name="store" size={14} /></span>
            {intl.formatMessage({ id: "outlet.detail.summary", defaultMessage: "Summary" })}
          </h2>
        </div>
        <div className="so-card__body">
          <div className="so-section so-section--2">
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "outlet.detail.code_label", defaultMessage: "Code" })}</span>
              <span className="so-field__value">{outlet.code ?? "—"}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "outlet.detail.name_label", defaultMessage: "Name" })}</span>
              <span className="so-field__value">{outlet.name}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "outlet.detail.customer_label", defaultMessage: "Customer" })}</span>
              <span className="so-field__value">{outlet.customer?.name ?? "—"}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "outlet.detail.area_label", defaultMessage: "Area" })}</span>
              <span className="so-field__value">{outlet.area?.name ?? "—"}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "outlet.detail.region_label", defaultMessage: "Region" })}</span>
              <span className="so-field__value">{outlet.area?.region?.name ?? "—"}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "outlet.detail.contacts_label", defaultMessage: "Contacts" })}</span>
              <span className="so-field__value">{outlet.contacts?.length ?? 0}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contacts ── */}
      <section className="so-card">
        <div className="so-card__header">
          <h2 className="so-card__title">
            <span className="so-card__icon"><OutletIcon name="contact" size={14} /></span>
            {intl.formatMessage({ id: "outlet.detail.contacts_title", defaultMessage: "Contacts" })}
          </h2>
          <p className="so-card__hint">{outlet.contacts?.length ?? 0} contacts</p>
        </div>
        <div className="so-card__body" style={{ padding: 0 }}>
          {(outlet.contacts?.length ?? 0) === 0 ? (
            <div className="so-card__body" style={{ textAlign: "center", padding: "2rem" }}>
              <OutletIcon name="contact" size={48} />
              <p style={{ marginTop: 12, color: "var(--ios-label-2)" }}>{intl.formatMessage({ id: "outlet.detail.no_contacts", defaultMessage: "No contacts yet" })}</p>
            </div>
          ) : (
            <div className="so-items-table">
              <div className="so-items-table__body">
                {outlet.contacts?.map((contact) => (
                  <div key={contact.id} className="so-items-table__row" style={{ cursor: "pointer" }} onClick={() => navigate(`/contact/${contact.id}`)}>
                    <div className="so-items-table__td so-items-table__td--product">
                      <span className="so-items-table__icon" data-tint="blue" aria-hidden="true"><OutletIcon name="contact" size={16} /></span>
                      <div className="so-items-table__product">
                        <span className="so-items-table__product-name">{contact.name}</span>
                        {contact.title && <span className="so-items-table__product-code">{contact.title}</span>}
                      </div>
                    </div>
                    <div className="so-items-table__td so-items-table__td--num so-items-table__td--muted">
                      <OutletIcon name="chevron-right" size={16} />
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
              <h3><OutletIcon name="delete" size={16} /> {intl.formatMessage({ id: "outlet.detail.delete_title", defaultMessage: "Delete outlet" })}</h3>
              <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setDeleteModalOpen(false)} aria-label="Close">
                <OutletIcon name="close" size={14} />
              </button>
            </div>
            <div className="so-modal__body">
              <div className="so-modal__icon so-modal__icon--error"><OutletIcon name="delete" size={28} /></div>
              <h3 className="so-modal__title">{intl.formatMessage({ id: "outlet.detail.delete_confirm_title", defaultMessage: "Are you sure?" })}</h3>
              <p className="so-modal__msg">
                {intl.formatMessage({ id: "outlet.index.delete_confirm_body", defaultMessage: 'Delete "{name}"? This action cannot be undone.' }, { name: outlet.name })}
              </p>
            </div>
            <div className="so-modal__footer">
              <button className="so-btn so-btn--ghost" onClick={() => setDeleteModalOpen(false)}>
                {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
              </button>
              <button className="so-btn so-btn--danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <span className="so-spinner" />}
                <OutletIcon name="delete" size={14} />
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