import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useIntl } from "react-intl";
import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { trpcClient } from "../../lib/trpc";
import { hasPermissionAtom } from "../../lib/atoms";
import { Spinner } from "../../ui/Spinner";
import { useToast } from "../../ui/useToast";
import { ButtonGroup } from "../../components/ButtonGroup";
import { ModulePage } from "../../components/ModulePage";

interface FormValues {
  title: string;
  content: string;
  source: string;
}

type ModalStage = "idle" | "confirm" | "loading" | "success" | "error";

const defaults = (): FormValues => ({ title: "", content: "", source: "" });

export const KnowledgeBaseFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSave = hasPermission(id ? "knowledge-base@update" : "knowledge-base@create");
  const toast = useToast();

  const isEdit = Boolean(id);
  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["knowledgeBaseDetail", id],
    enabled: isEdit && Boolean(id),
    queryFn: () => trpcClient.knowledgeBase.detail.query({ id: id ?? "" }),
  });

  const form = useForm({
    defaultValues: (isEdit && data ? { title: data.title, content: data.content, source: data.source } : defaults()) as FormValues,
    onSubmit: async () => {
      setModalStage("confirm");
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: FormValues) => trpcClient.knowledgeBase.create.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledgeBaseList"] });
      setResultMessage(intl.formatMessage({ id: "knowledgeBase.form.success.created", defaultMessage: "Knowledge entry created" }));
      setModalStage("success");
      setTimeout(() => navigate("/knowledge-base"), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: FormValues & { currentId: string }) => trpcClient.knowledgeBase.update.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledgeBaseList"] });
      queryClient.invalidateQueries({ queryKey: ["knowledgeBaseDetail", id] });
      setResultMessage(intl.formatMessage({ id: "knowledgeBase.form.success.updated", defaultMessage: "Knowledge entry updated" }));
      setModalStage("success");
      setTimeout(() => navigate(`/knowledge-base/${id}`), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const runSave = () => {
    setModalStage("loading");
    const values = form.state.values as FormValues;
    if (isEdit && id) {
      updateMutation.mutate({ ...values, currentId: id });
    } else {
      createMutation.mutate(values);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (modalStage === "idle") form.handleSubmit();
      }
      if (e.key === "Escape" && modalStage !== "idle") setModalStage("idle");
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [form, modalStage]);

  if (isLoading) {
    return (
      <ModulePage accent="#007AFF" accentEnd="#5856D6" aiContext={{ section: "knowledge-base-form", loading: true }}>
        <div className="m-state m-state--loading">
          <Spinner size="lg" />
          <span className="m-state__title">{intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}</span>
        </div>
      </ModulePage>
    );
  }

  return (
    <ModulePage accent="#007AFF" accentEnd="#5856D6" aiContext={{ section: "knowledge-base-form", isEdit, id: id ?? null }}>
      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
        <div className="m-form__header">
          <div>
            <h1 className="m-form__title">
              {isEdit ? intl.formatMessage({ id: "knowledgeBase.form.title_edit", defaultMessage: "Edit knowledge entry" }) : intl.formatMessage({ id: "knowledgeBase.form.title_create", defaultMessage: "New knowledge entry" })}
            </h1>
            <p className="m-form__subtitle">
              {isEdit ? intl.formatMessage({ id: "knowledgeBase.form.subtitle_edit", defaultMessage: "Update the knowledge snippet used by the assistant" }) : intl.formatMessage({ id: "knowledgeBase.form.subtitle_create", defaultMessage: "Create a new knowledge snippet for the assistant" })}
            </p>
          </div>
          <button type="button" className="m-form__back" onClick={() => navigate(isEdit && id ? `/knowledge-base/${id}` : "/knowledge-base")}>
            {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
          </button>
        </div>

        <section className="m-card">
          <div className="m-card__header">
            <h2 className="m-card__title">{intl.formatMessage({ id: "knowledgeBase.form.section_basic", defaultMessage: "Basic information" })}</h2>
          </div>
          <div className="m-card__body">
            <div className="m-section">
              <form.Field name="title" validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}>
                {(f) => (
                  <div className="m-field">
                    <label className="m-field__label">{intl.formatMessage({ id: "knowledgeBase.form.field_title", defaultMessage: "Title" })} *</label>
                    <input className={`m-field__input${f.state.meta.errors.length ? " m-field__input--invalid" : ""}`} type="text" value={f.state.value ?? ""} onChange={(e) => f.handleChange(e.target.value)} placeholder={intl.formatMessage({ id: "knowledgeBase.form.field_title_placeholder", defaultMessage: "Short title" })} />
                    {f.state.meta.errors.length > 0 && <span className="m-field__error">{f.state.meta.errors[0]}</span>}
                  </div>
                )}
              </form.Field>

              <form.Field name="source" validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}>
                {(f) => (
                  <div className="m-field">
                    <label className="m-field__label">{intl.formatMessage({ id: "knowledgeBase.form.field_source", defaultMessage: "Source" })} *</label>
                    <input className={`m-field__input${f.state.meta.errors.length ? " m-field__input--invalid" : ""}`} type="text" value={f.state.value ?? ""} onChange={(e) => f.handleChange(e.target.value)} placeholder={intl.formatMessage({ id: "knowledgeBase.form.field_source_placeholder", defaultMessage: "Policy, FAQ, SOP…" })} />
                    {f.state.meta.errors.length > 0 && <span className="m-field__error">{f.state.meta.errors[0]}</span>}
                  </div>
                )}
              </form.Field>

              <form.Field name="content" validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}>
                {(f) => (
                  <div className="m-field">
                    <label className="m-field__label">{intl.formatMessage({ id: "knowledgeBase.form.field_content", defaultMessage: "Content" })} *</label>
                    <textarea className={`m-field__input m-field__input--textarea${f.state.meta.errors.length ? " m-field__input--invalid" : ""}`} value={f.state.value ?? ""} onChange={(e) => f.handleChange(e.target.value)} rows={10} placeholder={intl.formatMessage({ id: "knowledgeBase.form.field_content_placeholder", defaultMessage: "Paste the knowledge text here" })} />
                    {f.state.meta.errors.length > 0 && <span className="m-field__error">{f.state.meta.errors[0]}</span>}
                  </div>
                )}
              </form.Field>
            </div>
          </div>
        </section>

        <div className="m-actions">
          <ButtonGroup
            items={[
              {
                key: "save",
                label: intl.formatMessage({ id: "knowledgeBase.form.save_button", defaultMessage: "Save" }),
                icon: <span aria-hidden="true">✓</span>,
                onClick: () => { form.handleSubmit(); },
                disabled: !canSave || createMutation.isPending || updateMutation.isPending,
                isLoading: createMutation.isPending || updateMutation.isPending,
                variant: "primary",
              },
            ]}
          />
        </div>
      </form>

      {modalStage !== "idle" && createPortal(
        <div className="m-modal__backdrop" onClick={() => modalStage !== "loading" && modalStage !== "confirm" && setModalStage("idle")}>
          <div className="m-modal" onClick={(e) => e.stopPropagation()}>
            {modalStage === "confirm" && (
              <>
                <div className="m-modal__header">
                  <h3>{intl.formatMessage({ id: "knowledgeBase.form.modal.confirm_title", defaultMessage: "Confirm save" })}</h3>
                  <button className="m-btn m-btn--ghost m-btn--sm" onClick={() => setModalStage("idle")} aria-label="Close">×</button>
                </div>
                <div className="m-modal__body">
                  <h3 className="m-modal__title">{intl.formatMessage({ id: "knowledgeBase.form.modal.confirm_body", defaultMessage: "Save this knowledge entry?" })}</h3>
                </div>
                <div className="m-modal__footer">
                  <button className="m-btn m-btn--ghost" onClick={() => setModalStage("idle")}>{intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}</button>
                  <button className="m-btn m-btn--primary" onClick={runSave}>{intl.formatMessage({ id: "common.action.confirm", defaultMessage: "Confirm" })}</button>
                </div>
              </>
            )}

            {modalStage === "loading" && (
              <div className="m-modal__body">
                <div className="m-modal__icon m-modal__icon--success" style={{ background: "var(--m-surface-2)", color: "var(--m-accent)" }}>
                  <span className="m-spinner m-spinner--lg" />
                </div>
                <p className="m-modal__msg">{intl.formatMessage({ id: "common.loading", defaultMessage: "Saving…" })}</p>
              </div>
            )}

            {modalStage === "success" && (
              <div className="m-modal__body">
                <h3 className="m-modal__title">{intl.formatMessage({ id: "knowledgeBase.form.modal.success", defaultMessage: "Success!" })}</h3>
                <p className="m-modal__msg">{resultMessage}</p>
              </div>
            )}

            {modalStage === "error" && (
              <>
                <div className="m-modal__header">
                  <h3>{intl.formatMessage({ id: "knowledgeBase.form.modal.error_title", defaultMessage: "Error" })}</h3>
                  <button className="m-btn m-btn--ghost m-btn--sm" onClick={() => setModalStage("idle")} aria-label="Close">×</button>
                </div>
                <div className="m-modal__body">
                  <p className="m-modal__msg">{resultMessage}</p>
                </div>
                <div className="m-modal__footer">
                  <button className="m-btn m-btn--ghost" onClick={() => setModalStage("idle")}>{intl.formatMessage({ id: "common.action.close", defaultMessage: "Close" })}</button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </ModulePage>
  );
};
