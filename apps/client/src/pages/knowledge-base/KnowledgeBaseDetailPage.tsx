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

type KnowledgeBaseDetail = {
  id: string;
  title: string;
  content: string;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export const KnowledgeBaseDetailPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canUpdate = hasPermission("knowledge-base@update");
  const canDelete = hasPermission("knowledge-base@delete");
  const toast = useToast();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["knowledgeBaseDetail", id],
    enabled: Boolean(id),
    queryFn: () => trpcClient.knowledgeBase.detail.query({ id: id ?? "" }),
  });

  const entry = data as KnowledgeBaseDetail | undefined;

  const handleDelete = async () => {
    if (!entry || isDeleting) return;
    setIsDeleting(true);
    try {
      await trpcClient.knowledgeBase.delete.mutate({ id: entry.id });
      await queryClient.invalidateQueries({ queryKey: ["knowledgeBaseList"] });
      setDeleteModalOpen(false);
      toast.success(intl.formatMessage({ id: "knowledgeBase.detail.delete_success", defaultMessage: "Knowledge entry deleted" }));
      navigate("/knowledge-base");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="m-page">
        <div className="m-state m-state--loading">
          <Spinner size="lg" />
          <span className="m-state__title">{intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}</span>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="m-page">
        <div className="m-form__shell" style={{ maxWidth: 480, margin: "60px auto" }}>
          <div className="m-card">
            <div className="m-card__body">
              <p style={{ color: "var(--ios-state-danger, #DC2626)", margin: 0 }}>
                {intl.formatMessage({ id: "knowledgeBase.detail.not_found", defaultMessage: "Knowledge entry not found" })}
              </p>
              <button type="button" className="m-btn m-btn--ghost" style={{ marginTop: 12 }} onClick={() => navigate("/knowledge-base")}>
                {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="m-page" data-ai-context={JSON.stringify({ section: "knowledge-base-detail", id: entry.id, name: entry.title, source: entry.source })}>
      <header className="m-detail-hero">
        <div className="m-detail-hero__top">
          <ButtonGroup
            size="md"
            items={[{ key: "back", label: intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" }), icon: <span aria-hidden="true">←</span>, to: "/knowledge-base" }]}
          />
          <ButtonGroup
            size="md"
            items={[
              ...(canUpdate ? [{ key: "edit", label: intl.formatMessage({ id: "common.action.edit", defaultMessage: "Edit" }), icon: <span aria-hidden="true">✎</span>, to: `/knowledge-base/${entry.id}/edit` }] : []),
              ...(canDelete ? [{ key: "delete", label: intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" }), icon: <span aria-hidden="true">🗑</span>, onClick: () => setDeleteModalOpen(true), variant: "danger" as const }] : []),
            ]}
          />
        </div>

        <div className="m-detail-hero__title-block">
          <div className="m-detail-hero__title-row">
            <div className="m-detail-hero__title-stack">
              <span className="m-detail-hero__kicker">{intl.formatMessage({ id: "nav.administration", defaultMessage: "Administration" })}</span>
              <h1 className="m-detail-hero__title">{entry.title}</h1>
              <span className="m-detail-hero__sub">{entry.source}</span>
            </div>
          </div>
        </div>
      </header>

      <section className="m-card">
        <div className="m-card__header">
          <h2 className="m-card__title">{intl.formatMessage({ id: "knowledgeBase.detail.summary", defaultMessage: "Summary" })}</h2>
        </div>
        <div className="m-card__body">
          <div className="m-section m-section--2">
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "knowledgeBase.detail.source_label", defaultMessage: "Source" })}</span>
              <span className="m-field__value">{entry.source}</span>
            </div>
            <div className="m-field">
              <span className="m-field__label">{intl.formatMessage({ id: "knowledgeBase.detail.updated_label", defaultMessage: "Updated" })}</span>
              <span className="m-field__value">{new Date(entry.updatedAt).toLocaleString()}</span>
            </div>
          </div>
          <div className="m-field" style={{ marginTop: 16 }}>
            <span className="m-field__label">{intl.formatMessage({ id: "knowledgeBase.detail.content_label", defaultMessage: "Content" })}</span>
            <div className="m-field__value" style={{ whiteSpace: "pre-wrap" }}>{entry.content}</div>
          </div>
        </div>
      </section>

      {deleteModalOpen && createPortal(
        <div className="m-modal__backdrop" onClick={() => !isDeleting && setDeleteModalOpen(false)}>
          <div className="m-modal" onClick={(e) => e.stopPropagation()}>
            <div className="m-modal__header">
              <h3>{intl.formatMessage({ id: "knowledgeBase.detail.delete_title", defaultMessage: "Delete knowledge entry" })}</h3>
              <button className="m-btn m-btn--ghost m-btn--sm" onClick={() => setDeleteModalOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="m-modal__body">
              <h3 className="m-modal__title">{intl.formatMessage({ id: "knowledgeBase.detail.delete_confirm_title", defaultMessage: "Are you sure?" })}</h3>
              <p className="m-modal__msg">
                {intl.formatMessage({ id: "knowledgeBase.index.delete_confirm_body", defaultMessage: 'Delete "{name}"? This action cannot be undone.' }, { name: entry.title })}
              </p>
            </div>
            <div className="m-modal__footer">
              <button className="m-btn m-btn--ghost" onClick={() => setDeleteModalOpen(false)}>{intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}</button>
              <button className="m-btn m-btn--danger" onClick={handleDelete} disabled={isDeleting}>{intl.formatMessage({ id: "common.action.delete", defaultMessage: "Delete" })}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
};
