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
import { RegionIcon } from "./RegionIcons";

interface FormValues {
  code: string;
  name: string;
}

type ModalStage = "idle" | "confirm" | "loading" | "success" | "error";

const defaults = (): FormValues => ({ code: "", name: "" });

export const RegionFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSave = hasPermission(id ? "region@update" : "region@create");
  const toast = useToast();

  const isEdit = Boolean(id);
  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["regionDetail", id],
    enabled: isEdit && Boolean(id),
    queryFn: () => trpcClient.region.detail.query({ id: id ?? "" }),
  });

  const form = useForm({
    defaultValues: (isEdit && data ? { code: data.code ?? "", name: data.name } : defaults()) as FormValues,
    onSubmit: async () => {
      setModalStage("confirm");
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: FormValues) => trpcClient.region.create.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regionList"] });
      setResultMessage(intl.formatMessage({ id: "region.form.success.created", defaultMessage: "Region created" }));
      setModalStage("success");
      setTimeout(() => navigate("/region"), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: FormValues & { currentId: string }) => trpcClient.region.update.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regionList"] });
      queryClient.invalidateQueries({ queryKey: ["regionDetail", id] });
      setResultMessage(intl.formatMessage({ id: "region.form.success.updated", defaultMessage: "Region updated" }));
      setModalStage("success");
      setTimeout(() => navigate(`/region/${id}`), 1200);
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
      <ModulePage accent="#007AFF" accentEnd="#5856D6" aiContext={{ section: "region-form", loading: true }}>
        <div className="m-state m-state--loading">
          <Spinner size="lg" />
          <span className="m-state__title">{intl.formatMessage({ id: "common.loading", defaultMessage: "Loading…" })}</span>
        </div>
      </ModulePage>
    );
  }

  return (
    <ModulePage accent="#007AFF" accentEnd="#5856D6" aiContext={{ section: "region-form", isEdit, id: id ?? null }}>
      <form
        onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}
      >
        {/* ── Header ── */}
        <div className="m-form__header">
          <div>
            <h1 className="m-form__title">
              {isEdit
                ? intl.formatMessage({ id: "region.form.title_edit", defaultMessage: "Edit region" })
                : intl.formatMessage({ id: "region.form.title_create", defaultMessage: "New region" })}
            </h1>
            <p className="m-form__subtitle">
              {isEdit ? "Update region details" : "Create a new geographical region"}
            </p>
          </div>
          <button type="button" className="m-form__back" onClick={() => navigate(isEdit && id ? `/region/${id}` : "/region")}>
            <RegionIcon name="back" size={14} />
            {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
          </button>
        </div>

        {/* ── Fields ── */}
        <section className="m-card">
          <div className="m-card__header">
            <h2 className="m-card__title">
              <span className="m-card__icon"><RegionIcon name="map" size={14} /></span>
              {intl.formatMessage({ id: "region.form.section_basic", defaultMessage: "Basic information" })}
            </h2>
          </div>
          <div className="m-card__body">
            <div className="m-section">
              <form.Field name="code">
                {(f) => (
                  <div className="m-field">
                    <label className="m-field__label">
                      {intl.formatMessage({ id: "region.form.field_code", defaultMessage: "Code" })}
                    </label>
                    <input
                      className="m-field__input"
                      type="text"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                      placeholder={intl.formatMessage({ id: "region.form.field_code_placeholder", defaultMessage: "Optional" })}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="name" validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}>
                {(f) => (
                  <div className="m-field">
                    <label className="m-field__label">
                      {intl.formatMessage({ id: "region.form.field_name", defaultMessage: "Name" })} *
                    </label>
                    <input
                      className={`m-field__input${f.state.meta.errors.length ? " m-field__input--invalid" : ""}`}
                      type="text"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                      placeholder={intl.formatMessage({ id: "region.form.field_name_placeholder", defaultMessage: "Region name" })}
                    />
                    {f.state.meta.errors.length > 0 && (
                      <span className="m-field__error">{f.state.meta.errors[0]}</span>
                    )}
                  </div>
                )}
              </form.Field>
            </div>
          </div>
        </section>

        {/* ── Actions ── */}
        <div className="m-actions">
          <ButtonGroup
            items={[
              {
                key: "save",
                label: intl.formatMessage({ id: "region.form.save_button", defaultMessage: "Save" }),
                icon: <RegionIcon name="check" size={14} />,
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
        <div className="m-modal__backdrop" onClick={() => modalStage !== "loading" && modalStage !== "confirm" && setModalStage("idle")}>
          <div className="m-modal" onClick={(e) => e.stopPropagation()}>
            {modalStage === "confirm" && (
              <>
                <div className="m-modal__header">
                  <h3>
                    {intl.formatMessage({ id: "region.form.modal.confirm_title", defaultMessage: "Confirm save" })}
                  </h3>
                  <button className="m-btn m-btn--ghost m-btn--sm" onClick={() => setModalStage("idle")} aria-label="Close">
                    <RegionIcon name="close" size={14} />
                  </button>
                </div>
                <div className="m-modal__body">
                  <div className="m-modal__icon m-modal__icon--success">
                    <RegionIcon name="check" size={28} />
                  </div>
                  <h3 className="m-modal__title">
                    {intl.formatMessage({ id: "region.form.modal.confirm_body", defaultMessage: "Save changes to this region?" })}
                  </h3>
                </div>
                <div className="m-modal__footer">
                  <button className="m-btn m-btn--ghost" onClick={() => setModalStage("idle")}>
                    {intl.formatMessage({ id: "common.action.cancel", defaultMessage: "Cancel" })}
                  </button>
                  <button className="m-btn m-btn--primary" onClick={runSave}>
                    {intl.formatMessage({ id: "common.action.confirm", defaultMessage: "Confirm" })}
                  </button>
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
              <>
                <div className="m-modal__body">
                  <div className="m-modal__icon m-modal__icon--success">
                    <RegionIcon name="check" size={28} />
                  </div>
                  <h3 className="m-modal__title">
                    {intl.formatMessage({ id: "region.form.modal.success", defaultMessage: "Success!" })}
                  </h3>
                  <p className="m-modal__msg">{resultMessage}</p>
                </div>
              </>
            )}

            {modalStage === "error" && (
              <>
                <div className="m-modal__header">
                  <h3>
                    {intl.formatMessage({ id: "region.form.modal.error_title", defaultMessage: "Error" })}
                  </h3>
                  <button className="m-btn m-btn--ghost m-btn--sm" onClick={() => setModalStage("idle")} aria-label="Close">
                    <RegionIcon name="close" size={14} />
                  </button>
                </div>
                <div className="m-modal__body">
                  <div className="m-modal__icon m-modal__icon--error">
                    <RegionIcon name="close" size={28} />
                  </div>
                  <p className="m-modal__msg">{resultMessage}</p>
                </div>
                <div className="m-modal__footer">
                  <button className="m-btn m-btn--ghost" onClick={() => setModalStage("idle")}>
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