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
import { EventProposalIcon } from "./EventProposalIcons";
import type { CreateEventProposalInput, UpdateEventProposalInput } from "@repo/schemas/event-proposal";

interface FormValues {
  name: string;
  eventType: string;
  description: string;
  venue: string;
  eventDate: string;
  eventEndDate: string;
  organizerName: string;
  organizerContact: string;
  areaId: string;
  proposedBudget: string;
  currency: string;
}

type ModalStage = "idle" | "confirm" | "loading" | "success" | "error";

const defaults = (): FormValues => ({
  name: "",
  eventType: "",
  description: "",
  venue: "",
  eventDate: "",
  eventEndDate: "",
  organizerName: "",
  organizerContact: "",
  areaId: "",
  proposedBudget: "",
  currency: "IDR",
});

export const EventProposalFormPage = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const hasPermission = useAtomValue(hasPermissionAtom);
  const canSave = hasPermission(id ? "eventProposal@update" : "eventProposal@create");
  const toast = useToast();

  const isEdit = Boolean(id);
  const [modalStage, setModalStage] = useState<ModalStage>("idle");
  const [resultMessage, setResultMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["eventProposalDetail", id],
    enabled: isEdit && Boolean(id),
    queryFn: () => trpcClient.eventProposal.detail.query({ id: id ?? "" }),
  });

  const { data: areas } = useQuery({
    queryKey: ["areaOptions"],
    queryFn: () => trpcClient.area.list.query({ page: 1, limit: 100 }),
  });

  const form = useForm({
    defaultValues: (isEdit && data ? {
      name: data.name,
      eventType: data.eventType ?? "",
      description: data.description ?? "",
      venue: data.venue ?? "",
      eventDate: data.eventDate,
      eventEndDate: data.eventEndDate ?? "",
      organizerName: data.organizerName ?? "",
      organizerContact: data.organizerContact ?? "",
      areaId: data.areaId,
      proposedBudget: data.proposedBudget != null ? String(data.proposedBudget) : "",
      currency: data.currency,
    } : defaults()) as FormValues,
    onSubmit: async () => {
      setModalStage("confirm");
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: CreateEventProposalInput) => trpcClient.eventProposal.create.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventProposalList"] });
      setResultMessage(intl.formatMessage({ id: "event_proposal.form.success.created", defaultMessage: "Region created" }));
      setModalStage("success");
      setTimeout(() => navigate("/eventProposal"), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (d: UpdateEventProposalInput) => trpcClient.eventProposal.update.mutate(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventProposalList"] });
      queryClient.invalidateQueries({ queryKey: ["eventProposalDetail", id] });
      setResultMessage(intl.formatMessage({ id: "event_proposal.form.success.updated", defaultMessage: "Region updated" }));
      setModalStage("success");
      setTimeout(() => navigate(`/eventProposal/${id}`), 1200);
    },
    onError: (e) => {
      setResultMessage(e instanceof Error ? e.message : "Failed");
      setModalStage("error");
    },
  });

  const runSave = () => {
    setModalStage("loading");
    const values = form.state.values as FormValues;
    const payload = {
      ...values,
      proposedBudget: values.proposedBudget ? Number(values.proposedBudget) : null,
    };
    if (isEdit && id) {
      updateMutation.mutate({ ...payload, currentId: id } as UpdateEventProposalInput);
    } else {
      createMutation.mutate(payload as CreateEventProposalInput);
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
      <ModulePage accent="#14B8A6" accentEnd="#0D948D" aiContext={{ section: "eventProposal-form", loading: true }}>
        <div className="m-loading"><Spinner size="lg" /></div>
      </ModulePage>
    );
  }

  return (
    <ModulePage accent="#14B8A6" accentEnd="#0D948D" aiContext={{ section: "eventProposal-form", isEdit, id: id ?? null }}>
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
                ? intl.formatMessage({ id: "event_proposal.form.title_edit", defaultMessage: "Edit eventProposal" })
                : intl.formatMessage({ id: "event_proposal.form.title_create", defaultMessage: "New eventProposal" })}
            </h1>
            <p className="so-form__subtitle">
              {isEdit ? "Update eventProposal details" : "Create a new geographical eventProposal"}
            </p>
          </div>
          <button type="button" className="so-form__back" onClick={() => navigate(isEdit && id ? `/eventProposal/${id}` : "/eventProposal")}>
            <EventProposalIcon name="back" size={14} />
            {intl.formatMessage({ id: "common.action.back", defaultMessage: "Back" })}
          </button>
        </div>

        {/* ── Fields ── */}
        <section className="so-card">
          <div className="so-card__header">
            <h2 className="so-card__title">
              <span className="so-card__icon"><EventProposalIcon name="document" size={14} /></span>
              {intl.formatMessage({ id: "event_proposal.form.section_basic", defaultMessage: "Basic information" })}
            </h2>
          </div>
          <div className="so-card__body">
            <div className="so-section">
              <form.Field name="name" validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}>
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "event_proposal.form.field_name", defaultMessage: "Event name" })} *
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

              <form.Field name="eventType">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "event_proposal.form.field_event_type", defaultMessage: "Event type" })}
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

              <form.Field name="description">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "event_proposal.form.field_description", defaultMessage: "Description" })}
                    </label>
                    <textarea
                      className="so-field__input"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="venue">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "event_proposal.form.field_venue", defaultMessage: "Venue" })}
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

              <form.Field name="eventDate" validators={{ onChange: ({ value }) => (!value ? "Required" : undefined) }}>
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "event_proposal.form.field_event_date", defaultMessage: "Event date" })} *
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

              <form.Field name="eventEndDate">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "event_proposal.form.field_event_end_date", defaultMessage: "Event end date" })}
                    </label>
                    <input
                      className="so-field__input"
                      type="date"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="organizerName">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "event_proposal.form.field_organizer_name", defaultMessage: "Organizer name" })}
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

              <form.Field name="organizerContact">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "event_proposal.form.field_organizer_contact", defaultMessage: "Organizer contact" })}
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
                      {intl.formatMessage({ id: "event_proposal.form.field_area", defaultMessage: "Area" })} *
                    </label>
                    <select
                      className={`so-field__input${f.state.meta.errors.length ? " so-field__input--invalid" : ""}`}
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                    >
                      <option value="">{intl.formatMessage({ id: "event_proposal.form.field_area_placeholder", defaultMessage: "Select area" })}</option>
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

              <form.Field name="proposedBudget">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "event_proposal.form.field_proposed_budget", defaultMessage: "Proposed budget" })}
                    </label>
                    <input
                      className="so-field__input"
                      type="number"
                      value={f.state.value ?? ""}
                      onChange={(e) => f.handleChange(e.target.value)}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="currency">
                {(f) => (
                  <div className="so-field">
                    <label className="so-field__label">
                      {intl.formatMessage({ id: "event_proposal.form.field_currency", defaultMessage: "Currency" })} *
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
            </div>
          </div>
        </section>

        {/* ── Actions ── */}
        <div className="so-actions">
          <ButtonGroup
            items={[
              {
                key: "save",
                label: intl.formatMessage({ id: "event_proposal.form.save_button", defaultMessage: "Save" }),
                icon: <EventProposalIcon name="check" size={14} />,
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
                    {intl.formatMessage({ id: "event_proposal.form.modal.confirm_title", defaultMessage: "Confirm save" })}
                  </h3>
                  <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setModalStage("idle")} aria-label="Close">
                    <EventProposalIcon name="close" size={14} />
                  </button>
                </div>
                <div className="so-modal__body">
                  <div className="so-modal__icon so-modal__icon--success">
                    <EventProposalIcon name="check" size={28} />
                  </div>
                  <h3 className="so-modal__title">
                    {intl.formatMessage({ id: "event_proposal.form.modal.confirm_body", defaultMessage: "Save changes to this eventProposal?" })}
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
                    <EventProposalIcon name="check" size={28} />
                  </div>
                  <h3 className="so-modal__title">
                    {intl.formatMessage({ id: "event_proposal.form.modal.success", defaultMessage: "Success!" })}
                  </h3>
                  <p className="so-modal__msg">{resultMessage}</p>
                </div>
              </>
            )}

            {modalStage === "error" && (
              <>
                <div className="so-modal__header">
                  <h3>
                    {intl.formatMessage({ id: "event_proposal.form.modal.error_title", defaultMessage: "Error" })}
                  </h3>
                  <button className="so-btn so-btn--ghost so-btn--sm" onClick={() => setModalStage("idle")} aria-label="Close">
                    <EventProposalIcon name="close" size={14} />
                  </button>
                </div>
                <div className="so-modal__body">
                  <div className="so-modal__icon so-modal__icon--error">
                    <EventProposalIcon name="close" size={28} />
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