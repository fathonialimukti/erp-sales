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
import { VisitLogIcon } from "./VisitLogIcons";

interface FormValues {
  salesmanId: string;
  outletId: string;
  date: string;
  purpose: string;
  notes: string;
}

type ModalStage = "idle" | "confirm" | "loading" | "success" | "error";

const defaults = (): FormValues => ({ salesmanId: "", outletId: "", date: "", purpose: "", notes: "" });

export const VisitLogFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSave = hasPermission(id ? "visitLog@update" : "visitLog@create");
  const toast = useToast();

  const isEdit = Boolean(id);
  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["visitLogDetail", id],
    enabled: isEdit && Boolean(id),
    queryFn: () => trpcClient.visitLog.detail.query({ id: id ?? "" }),
  });

  const { data: salesmen } = useQuery({
    queryKey: ["userOptions"],
    queryFn: () => trpcClient.user.list.query({ page: 1, limit: 100 }),
  });

  const { data: outlets } = useQuery({
    queryKey: ["outletOptions"],
    queryFn: () => trpcClient.outlet.list.query({ page: 1, limit: 100 }),
  });

  const form = useForm({
    defaultValues: (isEdit && data ? {
      salesmanId: data.salesmanId,
      outletId: data.outletId,
      date: data.date,
      purpose: data.purpose ?? "",
      notes: data.notes ?? "",
    } : defaults()) as FormValues,
    onSubmit: async () => {
      setModalStage("confirm");
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: FormValues) => trpcClient.visitLog.create.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitLogList"] });
      setResultMessage(intl.formatMessage({ id: "visit_log.form.success.created", defaultMessage: "Region created" }));
      setModalStage("success");
      setTimeout(() => navigate("/visitLog"), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: FormValues & { currentId: string }) => trpcClient.visitLog.update.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitLogList"] });
      queryClient.invalidateQueries({ queryKey: ["visitLogDetail", id] });
      setResultMessage(intl.formatMessage({ id: "visit_log.form.success.updated", defaultMessage: "Region updated" }));
      setModalStage("success");
      setTimeout(() => navigate(`/visitLog/${id}`), 1200);
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
      <ModulePage accent="#8B5CF6" accentEnd="#6D28D9" aiContext={{ section: "visitLog-form", loading: true }}>
        <div className="m-loading"><Spinner size="lg" /></div>
      </ModulePage>
    );
  }

  return (
    <ModulePage accent="#8B5CF6" accentEnd="#6D28D9" aiContext={{ section: "visitLog-form", isEdit, id: id ?? null }}>
      <form
        className="m-page"
        onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}
        style={{ gap: "1.25rem" }}
      >
        {/* ── Header ── */}
        <div className="so-form__header">
          <div>
            <h1 className="so-form__title">
              {isEdit
                ? intl.formatMessage({ id: "visit_log.form.title_edit", defaultMessage: "Edit visitLog" })
                : intl.formatMessage({ id: "visit_log.form.title_create", defaultMessage: "New visitLog" })}
            </h1>
            <p className="so-form__subtitle">
              {isEdit ? "Update visitLog details" : "Create a new geographical visitLog"}
            </p>
          </div>
          <button type="button" className="so-form__back" onClick={() => navigate(isEdit && id ? `/visitLog/${id}` : "/visitLog")}>
            <VisitLogIcon name="back" size={14} />
            {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
          </button>
        </div>

        {/* ── Fields ── */}
        <section className="so-card">
          <div className="so-card__header">
            <h2 className="so-card__title">
              <span className="so-card__icon"><VisitLogIcon name="clipboard" size={14} /></span>
              {intl.formatMessage({ id: "visit_log.form.section_basic", defaultMessage: "Basic information" })}
            </h2>
          </div>
          <div className="so-card__body">
            <div className="so-section">
              <form.Field name="salesmanId" validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}>
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "visitLog.form.field_salesman", defaultMessage: "Salesman" })} *
                    </label>
                    <select
                      className={`so-field__input${f.state.meta.errors.length ? " so-field__input--invalid" : ""}`}
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                    >
                      <option value="">{intl.formatMessage({ id: "visitLog.form.field_salesman_placeholder", defaultMessage: "Select salesman" })}</option>
                      {(salesmen?.data ?? []).map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    {f.state.meta.errors.length > 0 && (
                      <span className="so-field__error">{f.state.meta.errors[0]}</span>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="outletId" validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}>
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "visitLog.form.field_outlet", defaultMessage: "Outlet" })} *
                    </label>
                    <select
                      className={`so-field__input${f.state.meta.errors.length ? " so-field__input--invalid" : ""}`}
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                    >
                      <option value="">{intl.formatMessage({ id: "visitLog.form.field_outlet_placeholder", defaultMessage: "Select outlet" })}</option>
                      {(outlets?.data ?? []).map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                    {f.state.meta.errors.length > 0 && (
                      <span className="so-field__error">{f.state.meta.errors[0]}</span>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="date" validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}>
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "visitLog.form.field_date", defaultMessage: "Date" })} *
                    </label>
                    <input
                      className={`so-field__input${f.state.meta.errors.length ? " so-field__input--invalid" : ""}`}
                      type="date"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                    />
                    {f.state.meta.errors.length > 0 && (
                      <span className="so-field__error">{f.state.meta.errors[0]}</span>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="purpose">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "visitLog.form.field_purpose", defaultMessage: "Purpose" })}
                    </label>
                    <input
                      className="so-field__input"
                      type="text"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                      placeholder={intl.formatMessage({ id: "visitLog.form.field_purpose_placeholder", defaultMessage: "Optional" })}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="notes">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "visitLog.form.field_notes", defaultMessage: "Notes" })}
                    </label>
                    <textarea
                      className="so-field__input"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                      placeholder={intl.formatMessage({ id: "visitLog.form.field_notes_placeholder", defaultMessage: "Optional" })}
                    />
                  </div>
                )}
              </form.Field>
            </div>
          </div>
        </section>

        {/* ── Actions ── */}
        <div className="so-actions">
          <ButtonGroup
            items={[
              {
                key: "save",
                label: intl.formatMessage({ id: "visit_log.form.save_button", defaultMessage: "Save" }),
                icon: <VisitLogIcon name="check" size={14} />,
                onClick: () => { form.handleSubmit(); },
                disabled: !canSave || createMutation.isPending || updateMutation.isPending,
                isLoading: createMutation.isPending || updateMutation.isPending,
                variant: "primary",
              },
            ]}
          />
        </div>
      </form>

      {/* ── Modal ── */}
      {modalStage !== "idle" && createPortal(
        <div className="so-modal__backdrop" onClick={() => modalStage !== "loading" && modalStage !== "confirm" && setModalStage("idle")}>
          <div className="so-modal" onClick={(e) => e.stopPropagation()}>
            {modalStage === "confirm" && (
              <>
                <div className="so-modal__header">
                  <h3>
                    {intl.formatMessage({ id: "visit_log.form.modal.confirm_title", defaultMessage: "Confirm save" })}
                  </h3>
                  <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setModalStage("idle")} aria-label="Close">
                    <VisitLogIcon name="close" size={14} />
                  </button>
                </div>
                <div className="so-modal__body">
                  <div className="so-modal__icon so-modal__icon--success">
                    <VisitLogIcon name="check" size={28} />
                  </div>
                  <h3 className="so-modal__title">
                    {intl.formatMessage({ id: "visit_log.form.modal.confirm_body", defaultMessage: "Save changes to this visitLog?" })}
                  </h3>
                </div>
                <div className="so-modal__footer">
                  <button className="so-btn so-btn--ghost" onClick={() => setModalStage("idle")}>
                    {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
                  </button>
                  <button className="so-btn so-btn--primary" onClick={runSave}>
                    {intl.formatMessage({ id: "common.action.confirm", defaultMessage: "Confirm" })}
                  </button>
                </div>
              </>
            )}

            {modalStage === "loading" && (
              <div className="so-modal__body">
                <div className="so-modal__icon so-modal__icon--success" style={{ background: "var(--so-surface-2)", color: "var(--so-accent)" }}>
                  <span className="so-spinner so-spinner--lg" />
                </div>
                <p className="so-modal__msg">{intl.formatMessage({ id: "common.loading", defaultMessage: "Saving…" })}</p>
              </div>
            )}

            {modalStage === "success" && (
              <>
                <div className="so-modal__body">
                  <div className="so-modal__icon so-modal__icon--success">
                    <VisitLogIcon name="check" size={28} />
                  </div>
                  <h3 className="so-modal__title">
                    {intl.formatMessage({ id: "visit_log.form.modal.success", defaultMessage: "Success!" })}
                  </h3>
                  <p className="so-modal__msg">{resultMessage}</p>
                </div>
              </>
            )}

            {modalStage === "error" && (
              <>
                <div className="so-modal__header">
                  <h3>
                    {intl.formatMessage({ id: "visit_log.form.modal.error_title", defaultMessage: "Error" })}
                  </h3>
                  <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setModalStage("idle")} aria-label="Close">
                    <VisitLogIcon name="close" size={14} />
                  </button>
                </div>
                <div className="so-modal__body">
                  <div className="so-modal__icon so-modal__icon--error">
                    <VisitLogIcon name="close" size={28} />
                  </div>
                  <p className="so-modal__msg">{resultMessage}</p>
                </div>
                <div className="so-modal__footer">
                  <button className="so-btn so-btn--ghost" onClick={() => setModalStage("idle")}>
                    {intl.formatMessage({ id: "common.action.close", defaultMessage: "Close" })}
                  </button>
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