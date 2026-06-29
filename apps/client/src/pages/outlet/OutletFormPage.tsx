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
import { OutletIcon } from "./OutletIcons";

interface FormValues {
  code: string;
  name: string;
  customerId: string;
  areaId: string;
  address: string;
  contactName: string;
  contactPhone: string;
  latitude: number | null;
  longitude: number | null;
}

type ModalStage = "idle" | "confirm" | "loading" | "success" | "error";

const defaults = (): FormValues => ({
  code: "",
  name: "",
  customerId: "",
  areaId: "",
  address: "",
  contactName: "",
  contactPhone: "",
  latitude: null,
  longitude: null,
});

export const OutletFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSave = hasPermission(id ? "outlet@update" : "outlet@create");
  const toast = useToast();

  const isEdit = Boolean(id);
  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["outletDetail", id],
    enabled: isEdit && Boolean(id),
    queryFn: () => trpcClient.outlet.detail.query({ id: id ?? "" }),
  });

  const { data: customerList } = useQuery({
    queryKey: ["customerList", "all"],
    queryFn: () => trpcClient.customer.list.query({ page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: areaList } = useQuery({
    queryKey: ["areaList", "all"],
    queryFn: () => trpcClient.area.list.query({ page: 1, limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const customers = (customerList?.data ?? []) as { id: string; name: string }[];
  const areas = (areaList?.data ?? []) as { id: string; name: string }[];

  const form = useForm({
    defaultValues: (isEdit && data
      ? {
          code: (data as { code?: string }).code ?? "",
          name: (data as { name?: string }).name ?? "",
          customerId: (data as { customer?: { id: string } | null }).customer?.id ?? "",
          areaId: (data as { area?: { id: string } | null }).area?.id ?? "",
          address: (data as { address?: string }).address ?? "",
          contactName: (data as { contactName?: string }).contactName ?? "",
          contactPhone: (data as { contactPhone?: string }).contactPhone ?? "",
          latitude: (data as { latitude?: number | null }).latitude ?? null,
          longitude: (data as { longitude?: number | null }).longitude ?? null,
        }
      : defaults()) as FormValues,
    onSubmit: async () => {
      setModalStage("confirm");
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: FormValues) => trpcClient.outlet.create.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outletList"] });
      setResultMessage(intl.formatMessage({ id: "outlet.form.success.created", defaultMessage: "Region created" }));
      setModalStage("success");
      setTimeout(() => navigate("/outlet"), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: FormValues & { currentId: string }) => trpcClient.outlet.update.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outletList"] });
      queryClient.invalidateQueries({ queryKey: ["outletDetail", id] });
      setResultMessage(intl.formatMessage({ id: "outlet.form.success.updated", defaultMessage: "Region updated" }));
      setModalStage("success");
      setTimeout(() => navigate(`/outlet/${id}`), 1200);
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
      <ModulePage accent="#34D399" accentEnd="#059669" aiContext={{ section: "outlet-form", loading: true }}>
        <div className="m-loading"><Spinner size="lg" /></div>
      </ModulePage>
    );
  }

  return (
    <ModulePage accent="#34D399" accentEnd="#059669" aiContext={{ section: "outlet-form", isEdit, id: id ?? null }}>
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
                ? intl.formatMessage({ id: "outlet.form.title_edit", defaultMessage: "Edit outlet" })
                : intl.formatMessage({ id: "outlet.form.title_create", defaultMessage: "New outlet" })}
            </h1>
            <p className="so-form__subtitle">
              {isEdit ? "Update outlet details" : "Create a new geographical outlet"}
            </p>
          </div>
          <button type="button" className="so-form__back" onClick={() => navigate(isEdit && id ? `/outlet/${id}` : "/outlet")}>
            <OutletIcon name="back" size={14} />
            {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
          </button>
        </div>

        {/* ── Fields ── */}
        <section className="so-card">
          <div className="so-card__header">
            <h2 className="so-card__title">
              <span className="so-card__icon"><OutletIcon name="store" size={14} /></span>
              {intl.formatMessage({ id: "outlet.form.section_basic", defaultMessage: "Basic information" })}
            </h2>
          </div>
          <div className="so-card__body">
            <div className="so-section">
              <form.Field name="customerId" validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}>
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "outlet.form.field_customer", defaultMessage: "Customer" })} *
                    </label>
                    <select
                      className={`so-field__input${f.state.meta.errors.length ? " so-field__input--invalid" : ""}`}
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                    >
                      <option value="">{intl.formatMessage({ id: "outlet.form.select_customer", defaultMessage: "Select customer" })}</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {f.state.meta.errors.length > 0 && (
                      <span className="so-field__error">{f.state.meta.errors[0]}</span>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="areaId" validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}>
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "outlet.form.field_area", defaultMessage: "Area" })} *
                    </label>
                    <select
                      className={`so-field__input${f.state.meta.errors.length ? " so-field__input--invalid" : ""}`}
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                    >
                      <option value="">{intl.formatMessage({ id: "outlet.form.select_area", defaultMessage: "Select area" })}</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    {f.state.meta.errors.length > 0 && (
                      <span className="so-field__error">{f.state.meta.errors[0]}</span>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="code">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "outlet.form.field_code", defaultMessage: "Code" })}
                    </label>
                    <input
                      className="so-field__input"
                      type="text"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                      placeholder={intl.formatMessage({ id: "outlet.form.field_code_placeholder", defaultMessage: "Optional" })}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="name" validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}>
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "outlet.form.field_name", defaultMessage: "Name" })} *
                    </label>
                    <input
                      className={`so-field__input${f.state.meta.errors.length ? " so-field__input--invalid" : ""}`}
                      type="text"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                      placeholder={intl.formatMessage({ id: "outlet.form.field_name_placeholder", defaultMessage: "Outlet name" })}
                    />
                    {f.state.meta.errors.length > 0 && (
                      <span className="so-field__error">{f.state.meta.errors[0]}</span>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="address">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "outlet.form.field_address", defaultMessage: "Address" })}
                    </label>
                    <input
                      className="so-field__input"
                      type="text"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                      placeholder={intl.formatMessage({ id: "outlet.form.field_address_placeholder", defaultMessage: "Street address" })}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="contactName">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "outlet.form.field_contact_name", defaultMessage: "Contact name" })}
                    </label>
                    <input
                      className="so-field__input"
                      type="text"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                      placeholder={intl.formatMessage({ id: "outlet.form.field_contact_name_placeholder", defaultMessage: "Primary contact" })}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="contactPhone">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "outlet.form.field_contact_phone", defaultMessage: "Contact phone" })}
                    </label>
                    <input
                      className="so-field__input"
                      type="text"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                      placeholder={intl.formatMessage({ id: "outlet.form.field_contact_phone_placeholder", defaultMessage: "Phone number" })}
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
                label: intl.formatMessage({ id: "outlet.form.save_button", defaultMessage: "Save" }),
                icon: <OutletIcon name="check" size={14} />,
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
                    {intl.formatMessage({ id: "outlet.form.modal.confirm_title", defaultMessage: "Confirm save" })}
                  </h3>
                  <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setModalStage("idle")} aria-label="Close">
                    <OutletIcon name="close" size={14} />
                  </button>
                </div>
                <div className="so-modal__body">
                  <div className="so-modal__icon so-modal__icon--success">
                    <OutletIcon name="check" size={28} />
                  </div>
                  <h3 className="so-modal__title">
                    {intl.formatMessage({ id: "outlet.form.modal.confirm_body", defaultMessage: "Save changes to this outlet?" })}
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
                    <OutletIcon name="check" size={28} />
                  </div>
                  <h3 className="so-modal__title">
                    {intl.formatMessage({ id: "outlet.form.modal.success", defaultMessage: "Success!" })}
                  </h3>
                  <p className="so-modal__msg">{resultMessage}</p>
                </div>
              </>
            )}

            {modalStage === "error" && (
              <>
                <div className="so-modal__header">
                  <h3>
                    {intl.formatMessage({ id: "outlet.form.modal.error_title", defaultMessage: "Error" })}
                  </h3>
                  <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setModalStage("idle")} aria-label="Close">
                    <OutletIcon name="close" size={14} />
                  </button>
                </div>
                <div className="so-modal__body">
                  <div className="so-modal__icon so-modal__icon--error">
                    <OutletIcon name="close" size={28} />
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