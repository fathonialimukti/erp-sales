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
import { ActionProgramIcon } from "./ActionProgramIcons";

interface FormValues {
  name: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  budgetCurrency: string;
  areaId: string;
  picId: string;
  outletIds: string[];
}

type ModalStage = "idle" | "confirm" | "loading" | "success" | "error";

const defaults = (): FormValues => ({
  name: "",
  type: "",
  description: "",
  startDate: "",
  endDate: "",
  budgetCurrency: "IDR",
  areaId: "",
  picId: "",
  outletIds: [],
});

export const ActionProgramFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSave = hasPermission(id ? "actionProgram@update" : "actionProgram@create");
  const toast = useToast();

  const isEdit = Boolean(id);
  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["actionProgramDetail", id],
    enabled: isEdit && Boolean(id),
    queryFn: () => trpcClient.actionProgram.detail.query({ id: id ?? "" }),
  });

  const { data: areas } = useQuery({
    queryKey: ["areaOptions"],
    queryFn: () => trpcClient.area.list.query({ page: 1, limit: 100 }),
  });

  const { data: users } = useQuery({
    queryKey: ["userOptions"],
    queryFn: () => trpcClient.user.list.query({ page: 1, limit: 100 }),
  });

  const { data: outlets } = useQuery({
    queryKey: ["outletOptions"],
    queryFn: () => trpcClient.outlet.list.query({ page: 1, limit: 100 }),
  });

  const form = useForm({
    defaultValues: (isEdit && data ? {
      name: data.name,
      type: data.type,
      description: data.description ?? "",
      startDate: data.startDate,
      endDate: data.endDate,
      budgetCurrency: data.budgetCurrency,
      areaId: data.areaId,
      picId: data.picId,
      outletIds: data.outlets?.map((o) => o.outletId) ?? [],
    } : defaults()) as FormValues,
    onSubmit: async () => {
      setModalStage("confirm");
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: FormValues) => trpcClient.actionProgram.create.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actionProgramList"] });
      setResultMessage(intl.formatMessage({ id: "action_program.form.success.created", defaultMessage: "Region created" }));
      setModalStage("success");
      setTimeout(() => navigate("/actionProgram"), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: FormValues & { currentId: string }) => trpcClient.actionProgram.update.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actionProgramList"] });
      queryClient.invalidateQueries({ queryKey: ["actionProgramDetail", id] });
      setResultMessage(intl.formatMessage({ id: "action_program.form.success.updated", defaultMessage: "Region updated" }));
      setModalStage("success");
      setTimeout(() => navigate(`/actionProgram/${id}`), 1200);
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
      <ModulePage accent="#EC4899" accentEnd="#BE185D" aiContext={{ section: "actionProgram-form", loading: true }}>
        <div className="m-loading"><Spinner size="lg" /></div>
      </ModulePage>
    );
  }

  return (
    <ModulePage accent="#EC4899" accentEnd="#BE185D" aiContext={{ section: "actionProgram-form", isEdit, id: id ?? null }}>
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
                ? intl.formatMessage({ id: "action_program.form.title_edit", defaultMessage: "Edit actionProgram" })
                : intl.formatMessage({ id: "action_program.form.title_create", defaultMessage: "New actionProgram" })}
            </h1>
            <p className="so-form__subtitle">
              {isEdit ? "Update actionProgram details" : "Create a new geographical actionProgram"}
            </p>
          </div>
          <button type="button" className="so-form__back" onClick={() => navigate(isEdit && id ? `/actionProgram/${id}` : "/actionProgram")}>
            <ActionProgramIcon name="back" size={14} />
            {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
          </button>
        </div>

        {/* ── Fields ── */}
        <section className="so-card">
          <div className="so-card__header">
            <h2 className="so-card__title">
              <span className="so-card__icon"><ActionProgramIcon name="document" size={14} /></span>
              {intl.formatMessage({ id: "action_program.form.section_basic", defaultMessage: "Basic information" })}
            </h2>
          </div>
          <div className="so-card__body">
            <div className="so-section">
              <form.Field name="name" validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}>
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "action_program.form.field_name", defaultMessage: "Program name" })} *
                    </label>
                    <input
                      className={`so-field__input${f.state.meta.errors.length ? " so-field__input--invalid" : ""}`}
                      type="text"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                    />
                    {f.state.meta.errors.length > 0 && (
                      <span className="so-field__error">{f.state.meta.errors[0]}</span>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="type" validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}>
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "action_program.form.field_type", defaultMessage: "Type" })} *
                    </label>
                    <input
                      className={`so-field__input${f.state.meta.errors.length ? " so-field__input--invalid" : ""}`}
                      type="text"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                      placeholder={intl.formatMessage({ id: "action_program.form.field_type_placeholder", defaultMessage: "e.g. PROMO" })}
                    />
                    {f.state.meta.errors.length > 0 && (
                      <span className="so-field__error">{f.state.meta.errors[0]}</span>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="description">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "action_program.form.field_description", defaultMessage: "Description" })}
                    </label>
                    <textarea
                      className="so-field__input"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="startDate" validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}>
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "action_program.form.field_start_date", defaultMessage: "Start date" })} *
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

              <form.Field name="endDate" validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}>
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "action_program.form.field_end_date", defaultMessage: "End date" })} *
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

              <form.Field name="budgetCurrency">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "action_program.form.field_currency", defaultMessage: "Currency" })} *
                    </label>
                    <input
                      className="so-field__input"
                      type="text"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="areaId" validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}>
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "action_program.form.field_area", defaultMessage: "Area" })} *
                    </label>
                    <select
                      className={`so-field__input${f.state.meta.errors.length ? " so-field__input--invalid" : ""}`}
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                    >
                      <option value="">{intl.formatMessage({ id: "action_program.form.field_area_placeholder", defaultMessage: "Select area" })}</option>
                      {(areas?.data ?? []).map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    {f.state.meta.errors.length > 0 && (
                      <span className="so-field__error">{f.state.meta.errors[0]}</span>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="picId" validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}>
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "action_program.form.field_pic", defaultMessage: "PIC" })} *
                    </label>
                    <select
                      className={`so-field__input${f.state.meta.errors.length ? " so-field__input--invalid" : ""}`}
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                    >
                      <option value="">{intl.formatMessage({ id: "action_program.form.field_pic_placeholder", defaultMessage: "Select PIC" })}</option>
                      {(users?.data ?? []).map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    {f.state.meta.errors.length > 0 && (
                      <span className="so-field__error">{f.state.meta.errors[0]}</span>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="outletIds" validators={{ onChange: ({ value }) => (value.length === 0 ? "Required" : undefined) }}>
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "action_program.form.field_outlets", defaultMessage: "Outlets" })} *
                    </label>
                    <select
                      className={`so-field__input${f.state.meta.errors.length ? " so-field__input--invalid" : ""}`}
                      multiple
                      value={f.state.value ?? []}
                      onChange={(e) => f.handleChange(Array.from(e.target.selectedOptions).map((o) => o.value))}
                    >
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
            </div>
          </div>
        </section>

        {/* ── Actions ── */}
        <div className="so-actions">
          <ButtonGroup
            items={[
              {
                key: "save",
                label: intl.formatMessage({ id: "action_program.form.save_button", defaultMessage: "Save" }),
                icon: <ActionProgramIcon name="check" size={14} />,
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
                    {intl.formatMessage({ id: "action_program.form.modal.confirm_title", defaultMessage: "Confirm save" })}
                  </h3>
                  <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setModalStage("idle")} aria-label="Close">
                    <ActionProgramIcon name="close" size={14} />
                  </button>
                </div>
                <div className="so-modal__body">
                  <div className="so-modal__icon so-modal__icon--success">
                    <ActionProgramIcon name="check" size={28} />
                  </div>
                  <h3 className="so-modal__title">
                    {intl.formatMessage({ id: "action_program.form.modal.confirm_body", defaultMessage: "Save changes to this actionProgram?" })}
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
                    <ActionProgramIcon name="check" size={28} />
                  </div>
                  <h3 className="so-modal__title">
                    {intl.formatMessage({ id: "action_program.form.modal.success", defaultMessage: "Success!" })}
                  </h3>
                  <p className="so-modal__msg">{resultMessage}</p>
                </div>
              </>
            )}

            {modalStage === "error" && (
              <>
                <div className="so-modal__header">
                  <h3>
                    {intl.formatMessage({ id: "action_program.form.modal.error_title", defaultMessage: "Error" })}
                  </h3>
                  <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setModalStage("idle")} aria-label="Close">
                    <ActionProgramIcon name="close" size={14} />
                  </button>
                </div>
                <div className="so-modal__body">
                  <div className="so-modal__icon so-modal__icon--error">
                    <ActionProgramIcon name="close" size={28} />
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