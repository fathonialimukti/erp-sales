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
import { SummarizePageButton } from "../../components/SummarizePageButton";
import { CustomerIcon } from "./CustomerIcons";

type CustomerDetail = {
  id: string;
  code: string | null;
  name: string;
  status: string;
  outlets: { id: string; code: string | null; name: string }[];
  contacts: { id: string; name: string; title: string | null; email: string | null; phone: string | null }[];
};

export const CustomerDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("customer@update");
  const canDelete = hasPermission("customer@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["customerDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.customer.detail.query({ id: id ?? "" }),
  });

  const customer = data as CustomerDetail | undefined;

  const handleDelete = async () => {
    if (!customer || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.customer.delete.mutate({ id: customer.id });
      await queryClient.invalidateQueries({ queryKey: ["customerList"] });
      setDeleteModalOpen(false);
      toast.success(intl.formatMessage({ id: "customer.detail.delete_success", defaultMessage: "Region deleted" }));
      navigate("/customer");
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

  if (!customer) {
    return (
      <div className="so-page">
        <div className="so-form__shell" style={{ maxWidth: 480, margin: "60px auto" }}>
          <div className="so-card">
            <div className="so-card__body">
              <p style={{ color: "var(--ios-state-danger, #DC2626)", margin: 0 }}>
                {intl.formatMessage({ id: "customer.detail.not_found", defaultMessage: "Region not found" })}
              </p>
              <button type="button" className="so-btn so-btn--ghost" style={{ marginTop: 12 }} onClick={() => navigate("/customer")}>
                <CustomerIcon name="back" size={14} />
                {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="so-page" data-ai-context={JSON.stringify({ section: "customer-detail", id: customer.id, name: customer.name, areaCount: customer.outlets?.length ?? 0 })}>
      {/* ── Hero ── */}
      <header className="so-detail-hero">
        <div className="so-detail-hero__top">
          <ButtonGroup
            size="md"
            items={[{ key: "back", label: intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" }), icon: <CustomerIcon name="back" size={14} />, to: "/customer" }]}
          />
          <ButtonGroup
            size="md"
            items={[
              ...(canUpdate ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), icon: <CustomerIcon name="edit" size={14} />, to: `/customer/${customer.id}/edit` }] : []),
              ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <CustomerIcon name="delete" size={14} />, onClick: () => setDeleteModalOpen(true), variant: "danger" as const }] : []),
            ]}
          />
        </div>

        <div className="so-detail-hero__title-block">
          <div className="so-detail-hero__title-row">
            <div className="so-detail-hero__title-stack">
              <span className="so-detail-hero__kicker">{intl.formatMessage({ id: "nav.master_data", defaultMessage: "Master Data" })}</span>
              <h1 className="so-detail-hero__title">{customer.name}</h1>
              <span className="so-detail-hero__sub">{customer.code ?? "—"}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Summary ── */}
      <section className="so-card">
        <div className="so-card__header">
          <h2 className="so-card__title">
            <span className="so-card__icon"><CustomerIcon name="user" size={14} /></span>
            {intl.formatMessage({ id: "customer.detail.summary", defaultMessage: "Summary" })}
          </h2>
        </div>
        <div className="so-card__body">
          <div className="so-section so-section--2">
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "customer.detail.code_label", defaultMessage: "Code" })}</span>
              <span className="so-field__value">{customer.code ?? "—"}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "customer.detail.name_label", defaultMessage: "Name" })}</span>
              <span className="so-field__value">{customer.name}</span>
            </div>
            <div className="so-field">
              <span className="so-field__label">{intl.formatMessage({ id: "customer.detail.areas_label", defaultMessage: "Outlets" })}</span>
              <span className="so-field__value">{customer.outlets?.length ?? 0}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Areas ── */}
      <section className="so-card">
        <div className="so-card__header">
          <h2 className="so-card__title">
            <span className="so-card__icon"><CustomerIcon name="outlet" size={14} /></span>
            {intl.formatMessage({ id: "customer.detail.outlets_title", defaultMessage: "Outlets" })}
          </h2>
          <p className="so-card__hint">{customer.outlets?.length ?? 0} outlets</p>
        </div>
        <div className="so-card__body" style={{ padding: 0 }}>
          {customer.outlets?.length ?? 0 === 0 ? (
            <div className="so-card__body" style={{ textAlign: "center", padding: "2rem" }}>
              <CustomerIcon name="outlet" size={48} />
              <p style={{ marginTop: 12, color: "var(--ios-label-2)" }}>{intl.formatMessage({ id: "customer.detail.no_outlets", defaultMessage: "No outlets yet" })}</p>
            </div>
          ) : (
            <div className="so-items-table">
              <div className="so-items-table__body">
                {customer.outlets?.map((outlet) => (
                  <div key={outlet.id} className="so-items-table__row" style={{ cursor: "pointer" }} onClick={() => navigate(`/outlet/${outlet.id}`)}>
                    <div className="so-items-table__td so-items-table__td--product">
                      <span className="so-items-table__icon" data-tint="blue" aria-hidden="true"><CustomerIcon name="outlet" size={16} /></span>
                      <div className="so-items-table__product">
                        <span className="so-items-table__product-name">{outlet.name}</span>
                        {outlet.code && <span className="so-items-table__product-code">{outlet.code}</span>}
                      </div>
                    </div>
                    <div className="so-items-table__td so-items-table__td--num so-items-table__td--muted">
                      <CustomerIcon name="chevron-right" size={16} />
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
              <h3><CustomerIcon name="delete" size={16} /> {intl.formatMessage({ id: "customer.detail.delete_title", defaultMessage: "Delete customer" })}</h3>
              <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setDeleteModalOpen(false)} aria-label="Close">
                <CustomerIcon name="close" size={14} />
              </button>
            </div>
            <div className="so-modal__body">
              <div className="so-modal__icon so-modal__icon--error"><CustomerIcon name="delete" size={28} /></div>
              <h3 className="so-modal__title">{intl.formatMessage({ id: "customer.detail.delete_confirm_title", defaultMessage: "Are you sure?" })}</h3>
              <p className="so-modal__msg">
                {intl.formatMessage({ id: "customer.index.delete_confirm_body", defaultMessage: 'Delete "{name}"? This action cannot be undone.' }, { name: customer.name })}
              </p>
            </div>
            <div className="so-modal__footer">
              <button className="so-btn so-btn--ghost" onClick={() => setDeleteModalOpen(false)}>
                {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
              </button>
              <button className="so-btn so-btn--danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <span className="so-spinner" />}
                <CustomerIcon name="delete" size={14} />
                {intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
      <SummarizePageButton
        contextData={{
          section: "customer-detail",
          id: customer.id,
          name: customer.name,
          outletCount: customer.outlets?.length ?? 0,
        }}
        recordData={customer}
      />
    </section>
  );
};