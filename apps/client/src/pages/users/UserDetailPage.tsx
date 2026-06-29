import { useState } from "react";
import { createPortal } from "react-dom";
import { useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router";
import { useAtomValue } from "jotai";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { Spinner } from "../../ui/Spinner";
import { useToast } from "../../ui/useToast";
import { ButtonGroup } from "../../components/ButtonGroup";
import { EntityPhoto } from "../../components/EntityPhoto";

type UserDetail = {
  id: string;
  name: string | null;
  email: string;
  photo?: string | null;
  phone?: string | null;
  role: { id: string; name: string; description: string | null } | null;
  permissions?: string[];
  createdAt: string;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

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

export const UserDetailPage = () => {
  const { id } = useParams();
  const intl = useIntl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("user@update");
  const canDelete = hasPermission("user@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["userDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.user.detail.query({ id: id ?? "" }),
  });

  const record = data as UserDetail | undefined;

  const handleDelete = async () => {
    if (!record || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.user.delete.mutate({ id: record.id });
      await queryClient.invalidateQueries({ queryKey: ["userList"] });
      queryClient.removeQueries({ queryKey: ["userDetail", record.id] });
      setDeleteModalOpen(false);
      navigate("/users");
      toast.success(intl.formatMessage({ id: "users.detail.delete_success", defaultMessage: "User deleted" }));
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

  if (!record) {
    return (
      <section className="m-page">
        <div className="m-card">
          <div className="m-card__body">
            <p style={{ color: "var(--ios-state-danger, #DC2626)", margin: 0 }}>
              {intl.formatMessage({ id: "users.detail.not_found", defaultMessage: "User not found." })}
            </p>
            <button type="button" className="m-btn m-btn--ghost" style={{ marginTop: 12 }} onClick={() => navigate("/users")}>
              <BackIcon />
              {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="m-page" data-ai-context={JSON.stringify({ section: "user-detail", id: record.id, email: record.email, roleId: record.role?.id })}>
      <header className="m-detail-hero">
        <div className="m-detail-hero__top">
          <ButtonGroup size="md" items={[{ key: "back", label: intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" }), icon: <BackIcon />, to: "/users" }]} />
          <ButtonGroup size="md" items={[
            ...(canUpdate ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), icon: <EditIcon />, to: `/users/${record.id}/edit` }] : []),
            ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <DeleteIcon />, onClick: () => setDeleteModalOpen(true), variant: "danger" as const }] : []),
          ]} />
        </div>
        <div className="m-detail-hero__title-block">
          <div className="m-detail-hero__title-row">
            <div className="m-detail-hero__title-stack">
              <span className="m-detail-hero__kicker">{intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}</span>
              <h1 className="m-detail-hero__title">{record.name ?? record.email}</h1>
              <span className="m-detail-hero__sub">{record.email}</span>
            </div>
          </div>
        </div>
      </header>

      <section className="m-card">
        <div className="m-card__header">
          <h2 className="m-card__title">{intl.formatMessage({ id: "users.detail.info", defaultMessage: "Account information" })}</h2>
        </div>
        <div className="m-card__body">
          <div className="m-section m-section--2">
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "users.detail.name", defaultMessage: "Name" })}</span>
              <span className="m-field__value">{record.name ?? "—"}</span>
            </div>
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "users.detail.email", defaultMessage: "Email" })}</span>
              <span className="m-field__value">{record.email}</span>
            </div>
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "users.detail.phone", defaultMessage: "Phone" })}</span>
              <span className="m-field__value">{record.phone ?? "—"}</span>
            </div>
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "users.detail.role", defaultMessage: "Role" })}</span>
              <span className="m-field__value">{record.role?.name ?? "—"}</span>
            </div>
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "users.detail.created", defaultMessage: "Created" })}</span>
              <span className="m-field__value">{formatDate(record.createdAt)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="m-card">
        <div className="m-card__header">
          <h2 className="m-card__title">{intl.formatMessage({ id: "users.detail.role", defaultMessage: "Role" })}</h2>
          <p className="m-card__hint">{record.role?.name ?? "—"}</p>
        </div>
        <div className="m-card__body">
          {record.role?.description ? (
            <p style={{ color: "var(--ios-label-2)", fontSize: "0.875rem", lineHeight: 1.5 }}>{record.role.description}</p>
          ) : (
            <p style={{ color: "var(--ios-label-3)", fontSize: "0.875rem" }}>{intl.formatMessage({ id: "users.detail.no_permissions", defaultMessage: "No role description available." })}</p>
          )}
        </div>
      </section>

      {deleteModalOpen && createPortal(
        <div className="m-modal__backdrop" onClick={() => !isDeleting && setDeleteModalOpen(false)}>
          <div className="m-modal" onClick={(e) => e.stopPropagation()}>
            <div className="m-modal__header">
              <h3>{intl.formatMessage({ id: "users.detail.delete_title", defaultMessage: "Delete user" })}</h3>
              <button className="m-btn m-btn--ghost m-btn--sm" onClick={() => setDeleteModalOpen(false)} aria-label="Close"><CloseIcon /></button>
            </div>
            <div className="m-modal__body">
              <div className="m-modal__icon m-modal__icon--error"><DeleteIcon /></div>
              <h3 className="m-modal__title">{intl.formatMessage({ id: "users.detail.delete_confirm_title", defaultMessage: "Are you sure?" })}</h3>
              <p className="m-modal__msg">{intl.formatMessage({ id: "users.detail.delete_confirm", defaultMessage: 'Delete "{name}"? This action cannot be undone.' }, { name: record.name ?? record.email })}</p>
            </div>
            <div className="m-modal__footer">
              <button className="m-btn m-btn--ghost" onClick={() => setDeleteModalOpen(false)}>{intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}</button>
              <button className="m-btn m-btn--danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting && <span className="m-spinner" />}
                <DeleteIcon />
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
